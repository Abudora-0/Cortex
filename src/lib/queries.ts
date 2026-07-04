import { prisma } from "@/lib/db";
import {
  courseStanding,
  gradePointsFor,
  letterFor,
  parseScheme,
  type GradeSchemeSpec,
} from "@/lib/gpa";

export interface CourseComputed {
  id: string;
  title: string;
  code: string | null;
  creditHours: number;
  source: string;
  percent: number | null;
  gradedWeight: number;
  letter: string | null;
  gradePoints: number | null;
  assessmentCount: number;
  scheme: GradeSchemeSpec;
  /** For LMS courses: "Confirmed" | "Provisional". */
  lmsStatus: string | null;
  /** True when grade points are authoritative from the LMS (not recomputed). */
  fromLms: boolean;
}

/** Credit-hour weighted average of already-resolved grade points. */
function aggregateGpa(
  courses: { creditHours: number; gradePoints: number | null }[]
): { gpa: number | null; creditHours: number } {
  const graded = courses.filter((c) => c.gradePoints != null && c.creditHours > 0);
  const credits = graded.reduce((s, c) => s + c.creditHours, 0);
  if (credits === 0) return { gpa: null, creditHours: 0 };
  const points = graded.reduce((s, c) => s + c.gradePoints! * c.creditHours, 0);
  return { gpa: Math.round((points / credits) * 100) / 100, creditHours: credits };
}

export interface SemesterComputed {
  id: string;
  name: string;
  order: number;
  courses: CourseComputed[];
  gpa: number | null;
  creditHours: number;
}

export async function getUserDefaultScheme(userId: string): Promise<GradeSchemeSpec> {
  const def = await prisma.gradeScheme.findFirst({
    where: { userId, courseId: null },
  });
  return parseScheme(def?.boundaries);
}

export async function getAcademics(userId: string) {
  const [semesters, userDefault] = await Promise.all([
    prisma.semester.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: {
        courses: {
          orderBy: { createdAt: "asc" },
          include: { assessments: true, gradeScheme: true },
        },
      },
    }),
    getUserDefaultScheme(userId),
  ]);

  const computed: SemesterComputed[] = semesters.map((sem) => {
    const courses: CourseComputed[] = sem.courses.map((c) => {
      const scheme = c.gradeScheme
        ? parseScheme(c.gradeScheme.boundaries)
        : userDefault;

      // LMS courses carry the university's official (relative) grade - use it
      // verbatim, never recompute from the raw percentage.
      if (c.source === "LMS" && c.lmsGradePoints != null) {
        return {
          id: c.id,
          title: c.title,
          code: c.code,
          creditHours: c.creditHours,
          source: c.source,
          percent: c.lmsPercent,
          gradedWeight: 1,
          letter: c.lmsGrade,
          gradePoints: c.lmsGradePoints,
          assessmentCount: c.assessments.length,
          scheme,
          lmsStatus: c.lmsStatus,
          fromLms: true,
        };
      }

      const standing = courseStanding(c.assessments);
      return {
        id: c.id,
        title: c.title,
        code: c.code,
        creditHours: c.creditHours,
        source: c.source,
        percent: standing.percent,
        gradedWeight: standing.gradedWeight,
        letter: standing.percent != null ? letterFor(standing.percent, scheme) : null,
        gradePoints:
          standing.percent != null ? gradePointsFor(standing.percent, scheme) : null,
        assessmentCount: c.assessments.length,
        scheme,
        lmsStatus: null,
        fromLms: false,
      };
    });
    const { gpa, creditHours } = aggregateGpa(courses);
    return { id: sem.id, name: sem.name, order: sem.order, courses, gpa, creditHours };
  });

  // Sort semesters academically (Fall 2025 → Spring 2026 → Fall 2026). Names
  // that don't parse keep their manual order, after the parsed ones.
  computed.sort((a, b) => semesterChronoKey(a.name, a.order) - semesterChronoKey(b.name, b.order));

  // CGPA over all graded courses across semesters
  const allCourses = computed.flatMap((s) => s.courses);
  const { gpa: cgpa, creditHours: totalCredits } = aggregateGpa(allCourses);

  return { semesters: computed, cgpa, totalCredits, userDefault };
}

export async function getDashboardData(userId: string) {
  const [academics, profile, tasks, todayEvents, recentNotes, upcoming] =
    await Promise.all([
      getAcademics(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { lmsRoll: true, lmsProgram: true, lmsSemesterSeq: true, lmsDepartment: true },
      }),
      prisma.task.findMany({
        where: { userId, done: false },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        take: 8,
        include: { course: { select: { code: true, title: true } } },
      }),
      prisma.scheduleEvent.findMany({
        where: { userId, dayOfWeek: mondayIndexedDay(new Date()) },
        orderBy: { startMin: "asc" },
        include: { course: { select: { code: true } } },
      }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { course: { select: { code: true, title: true } } },
      }),
      prisma.assessment.findMany({
        where: {
          course: { semester: { userId } },
          dueAt: { gte: new Date() },
        },
        orderBy: { dueAt: "asc" },
        take: 5,
        include: { course: { select: { code: true, title: true } } },
      }),
    ]);

  return { ...academics, profile, tasks, todayEvents, recentNotes, upcoming };
}

const SEASON_ORDER: Record<string, number> = {
  spring: 1,
  summer: 2,
  fall: 3,
  autumn: 3,
  winter: 4,
};

/** Chronological sort key from a semester name like "Fall 2025". */
function semesterChronoKey(name: string, fallbackOrder: number): number {
  const m = name.match(/(spring|summer|fall|autumn|winter)\s+(\d{4})/i);
  if (!m) return 1_000_000 + fallbackOrder; // unparsed names sink to the end
  return parseInt(m[2], 10) * 10 + (SEASON_ORDER[m[1].toLowerCase()] ?? 0);
}

export function mondayIndexedDay(d: Date) {
  // JS getDay(): 0 = Sunday. Our schedule uses 0 = Monday.
  return (d.getDay() + 6) % 7;
}
