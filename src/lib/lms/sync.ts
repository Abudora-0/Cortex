import { z } from "zod";
import { prisma } from "@/lib/db";
import { fetchSnapshot, type LmsResult, type LmsSnapshot } from "./obe-client";

export interface SyncSummary {
  studentRoll: string;
  semesters: number;
  courses: number;
}

// Shape a bookmarklet is allowed to POST to /api/lms/ingest. Validated so the
// server never trusts arbitrary client JSON.
const num = z.number().finite();
export const lmsSnapshotSchema = z.object({
  studentId: num.int(),
  roll: z.string().max(40),
  name: z.string().max(120),
  program: z.string().max(200).nullable(),
  profile: z.object({
    roll: z.string().max(40),
    program: z.string().max(200).nullable(),
    department: z.string().max(200).nullable(),
    semesterSeq: num.int().min(0).max(50).nullable(),
  }),
  results: z
    .array(
      z.object({
        lmsCourseId: z.string().max(40),
        semesterName: z.string().max(80),
        code: z.string().max(30).nullable(),
        title: z.string().max(200),
        creditHours: num.min(0).max(60),
        percent: num.min(0).max(1000).nullable(),
        grade: z.string().max(8).nullable(),
        gradePoints: num.min(0).max(4).nullable(),
        status: z.string().max(40).nullable(),
        order: num.int().min(0).max(10000),
        teacher: z.string().max(120).nullable().optional(),
        outline: z.string().max(6000).nullable().optional(),
      })
    )
    .max(300),
}) satisfies z.ZodType<LmsSnapshot>;

/**
 * Upsert a snapshot (from the local session fetch OR the bookmarklet) as
 * LMS-sourced profile + semesters + courses for `userId`. Idempotent: LMS
 * courses match by lmsCourseId and update in place; MANUAL courses are untouched.
 */
export async function applyLmsSnapshot(
  userId: string,
  snap: LmsSnapshot
): Promise<SyncSummary> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lmsRoll: snap.profile.roll,
      lmsProgram: snap.profile.program,
      lmsSemesterSeq: snap.profile.semesterSeq,
      lmsDepartment: snap.profile.department,
    },
  });

  // Group results by semester, preserving first-seen (chronological) order.
  const bySemester = new Map<string, LmsResult[]>();
  for (const r of [...snap.results].sort((a, b) => a.order - b.order)) {
    if (!bySemester.has(r.semesterName)) bySemester.set(r.semesterName, []);
    bySemester.get(r.semesterName)!.push(r);
  }

  let courseCount = 0;
  // Resolve LMS-named instructors to Teacher rows once per sync.
  const teacherCache = new Map<string, string>();
  const resolveTeacher = async (name: string | null | undefined): Promise<string | null> => {
    const key = name?.trim();
    if (!key) return null;
    const cached = teacherCache.get(key.toLowerCase());
    if (cached) return cached;
    const found = await prisma.teacher.findFirst({ where: { userId, name: key }, select: { id: true } });
    const id = found?.id ?? (await prisma.teacher.create({ data: { userId, name: key } })).id;
    teacherCache.set(key.toLowerCase(), id);
    return id;
  };

  for (const [semesterName, results] of bySemester) {
    let semester = await prisma.semester.findFirst({
      where: { userId, name: semesterName },
    });
    if (!semester) {
      const last = await prisma.semester.findFirst({
        where: { userId },
        orderBy: { order: "desc" },
      });
      semester = await prisma.semester.create({
        data: { userId, name: semesterName, order: (last?.order ?? 0) + 1 },
      });
    }

    for (const r of results) {
      const data = {
        title: r.title,
        code: r.code,
        creditHours: r.creditHours,
        source: "LMS",
        lmsCourseId: r.lmsCourseId,
        lmsPercent: r.percent,
        lmsGrade: r.grade,
        lmsGradePoints: r.gradePoints,
        lmsStatus: r.status,
        semesterId: semester.id,
      };
      const teacherId = await resolveTeacher(r.teacher);
      const existing = await prisma.course.findFirst({
        where: { lmsCourseId: r.lmsCourseId, semester: { userId } },
      });
      if (existing) {
        // Never clobber anything the student edited by hand — only fill blanks.
        await prisma.course.update({
          where: { id: existing.id },
          data: {
            ...data,
            ...(r.outline && !existing.outline ? { outline: r.outline } : {}),
            ...(teacherId && !existing.teacherId ? { teacherId } : {}),
          },
        });
      } else {
        await prisma.course.create({
          data: { ...data, outline: r.outline ?? null, teacherId: teacherId ?? undefined },
        });
      }
      courseCount++;
    }
  }

  return { studentRoll: snap.roll, semesters: bySemester.size, courses: courseCount };
}

/** Local path: fetch via the saved session file, then apply. */
export async function syncLmsForUser(userId: string): Promise<SyncSummary> {
  const snap = await fetchSnapshot();
  return applyLmsSnapshot(userId, snap);
}
