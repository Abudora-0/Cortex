import { z } from "zod";

// ---------------------------------------------------------------------------
// Grade scheme model
//
// Schemes are stored as JSON strings (SQLite has no Json column). Two kinds:
//  - "stepwise": classic letter table - percent >= minPercent → gradePoints
//  - "linear":   UET-style interpolation - full grade points at/above
//                maxPercent, dropping perMarkDrop per percentage point,
//                clamped to passGp at passPercent; below passPercent = 0
// ---------------------------------------------------------------------------

export const boundarySchema = z.object({
  letter: z.string().min(1).max(4),
  minPercent: z.number().min(0).max(100),
  gradePoints: z.number().min(0).max(4),
});

export const schemeSchema = z.object({
  kind: z.enum(["stepwise", "linear"]),
  // Letter boundaries are used for the displayed letter in both kinds.
  boundaries: z.array(boundarySchema).min(1),
  linear: z
    .object({
      maxPercent: z.number(),
      maxGp: z.number(),
      perMarkDrop: z.number(),
      passPercent: z.number(),
      passGp: z.number(),
    })
    .optional(),
});

export type GradeSchemeSpec = z.infer<typeof schemeSchema>;
export type Boundary = z.infer<typeof boundarySchema>;

// Official UET Lahore letter/grade-point table, per "Undergraduate Semester
// Regulations 2016" §10(c) (uet.edu.pk/gallery/UG_Sem_Regulations_2016.pdf):
// A+/A = 4.0, A− 3.7, B+ 3.3, B 3.0, B− 2.7, C+ 2.3, C 2.0, C− 1.7,
// D+ 1.3, D 1.0, F 0. UET grades RELATIVELY - instructors set the percent
// thresholds per subject from the class mean/SD - so the minPercent cutoffs
// below are sensible editable defaults, not university-mandated values.
// The "linear" kind remains available for departments that interpolate.
export const UET_DEFAULT_SCHEME: GradeSchemeSpec = {
  kind: "stepwise",
  boundaries: [
    { letter: "A+", minPercent: 90, gradePoints: 4.0 },
    { letter: "A", minPercent: 85, gradePoints: 4.0 },
    { letter: "A-", minPercent: 80, gradePoints: 3.7 },
    { letter: "B+", minPercent: 75, gradePoints: 3.3 },
    { letter: "B", minPercent: 70, gradePoints: 3.0 },
    { letter: "B-", minPercent: 67, gradePoints: 2.7 },
    { letter: "C+", minPercent: 64, gradePoints: 2.3 },
    { letter: "C", minPercent: 60, gradePoints: 2.0 },
    { letter: "C-", minPercent: 57, gradePoints: 1.7 },
    { letter: "D+", minPercent: 54, gradePoints: 1.3 },
    { letter: "D", minPercent: 50, gradePoints: 1.0 },
    { letter: "F", minPercent: 0, gradePoints: 0.0 },
  ],
};

// UET letter grades → grade points, in display order (for the calculator's
// dropdown). A+ and A both map to 4.0; grading below is relative in practice.
export const UET_LETTER_GRADES: { letter: string; gradePoints: number }[] = [
  { letter: "A+", gradePoints: 4.0 },
  { letter: "A", gradePoints: 4.0 },
  { letter: "A-", gradePoints: 3.7 },
  { letter: "B+", gradePoints: 3.3 },
  { letter: "B", gradePoints: 3.0 },
  { letter: "B-", gradePoints: 2.7 },
  { letter: "C+", gradePoints: 2.3 },
  { letter: "C", gradePoints: 2.0 },
  { letter: "C-", gradePoints: 1.7 },
  { letter: "D+", gradePoints: 1.3 },
  { letter: "D", gradePoints: 1.0 },
  { letter: "F", gradePoints: 0.0 },
];

// Starting values when a user switches a scheme to "linear" mode.
export const DEFAULT_LINEAR_RULE = {
  maxPercent: 85,
  maxGp: 4.0,
  perMarkDrop: 0.1,
  passPercent: 50,
  passGp: 1.0,
};

export function parseScheme(json: string | null | undefined): GradeSchemeSpec {
  if (!json) return UET_DEFAULT_SCHEME;
  try {
    const parsed = schemeSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : UET_DEFAULT_SCHEME;
  } catch {
    return UET_DEFAULT_SCHEME;
  }
}

export function gradePointsFor(percent: number, scheme: GradeSchemeSpec): number {
  const p = clampPercent(percent);
  if (scheme.kind === "linear" && scheme.linear) {
    const { maxPercent, maxGp, perMarkDrop, passPercent, passGp } = scheme.linear;
    if (p < passPercent) return 0;
    if (p >= maxPercent) return maxGp;
    return round2(Math.max(passGp, maxGp - (maxPercent - p) * perMarkDrop));
  }
  const sorted = [...scheme.boundaries].sort((a, b) => b.minPercent - a.minPercent);
  for (const b of sorted) {
    if (p >= b.minPercent) return b.gradePoints;
  }
  return 0;
}

export function letterFor(percent: number, scheme: GradeSchemeSpec): string {
  const p = clampPercent(percent);
  const sorted = [...scheme.boundaries].sort((a, b) => b.minPercent - a.minPercent);
  for (const b of sorted) {
    if (p >= b.minPercent) return b.letter;
  }
  return sorted[sorted.length - 1]?.letter ?? "F";
}

// ---------------------------------------------------------------------------
// Course percentage
// ---------------------------------------------------------------------------

export interface AssessmentLike {
  obtained: number | null;
  total: number;
  weight: number | null;
}

export interface CourseStanding {
  /** Weighted percent over graded assessments only (0–100), null if none graded. */
  percent: number | null;
  /** Share of total course weight that has been graded so far (0–1). */
  gradedWeight: number;
}

/**
 * Current standing in a course. If every assessment has a weight, marks are
 * combined weight-proportionally; otherwise raw obtained/total sums are used.
 */
export function courseStanding(assessments: AssessmentLike[]): CourseStanding {
  const graded = assessments.filter((a) => a.obtained != null && a.total > 0);
  if (graded.length === 0) return { percent: null, gradedWeight: 0 };

  const allWeighted = assessments.every((a) => a.weight != null);
  if (allWeighted) {
    const totalWeight = assessments.reduce((s, a) => s + (a.weight ?? 0), 0) || 1;
    const gradedWeightSum = graded.reduce((s, a) => s + (a.weight ?? 0), 0);
    if (gradedWeightSum === 0) return { percent: null, gradedWeight: 0 };
    const achieved = graded.reduce(
      (s, a) => s + ((a.obtained! / a.total) * (a.weight ?? 0)),
      0
    );
    return {
      percent: round2((achieved / gradedWeightSum) * 100),
      gradedWeight: gradedWeightSum / totalWeight,
    };
  }

  const totalMarks = graded.reduce((s, a) => s + a.total, 0);
  const obtained = graded.reduce((s, a) => s + a.obtained!, 0);
  const allTotal = assessments.reduce((s, a) => s + a.total, 0) || 1;
  return {
    percent: round2((obtained / totalMarks) * 100),
    gradedWeight: totalMarks / allTotal,
  };
}

// ---------------------------------------------------------------------------
// GPA / CGPA - credit-hour weighted
// ---------------------------------------------------------------------------

export interface CourseGradeInput {
  creditHours: number;
  percent: number | null;
}

export interface GpaResult {
  gpa: number | null;
  creditHours: number;
}

export function weightedGpa(
  courses: CourseGradeInput[],
  scheme: (index: number) => GradeSchemeSpec
): GpaResult {
  // Courses with no marks yet are excluded; 0-credit courses contribute
  // nothing to either side of the ratio.
  const graded = courses
    .map((c, i) => ({ ...c, spec: scheme(i) }))
    .filter((c) => c.percent != null && c.creditHours > 0);
  const credits = graded.reduce((s, c) => s + c.creditHours, 0);
  if (credits === 0) return { gpa: null, creditHours: 0 };
  const points = graded.reduce(
    (s, c) => s + gradePointsFor(c.percent!, c.spec) * c.creditHours,
    0
  );
  return { gpa: round2(points / credits), creditHours: credits };
}

function clampPercent(p: number) {
  return Math.min(100, Math.max(0, p));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
