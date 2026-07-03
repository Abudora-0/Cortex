import { describe, expect, it } from "vitest";
import {
  UET_DEFAULT_SCHEME,
  courseStanding,
  gradePointsFor,
  letterFor,
  parseScheme,
  weightedGpa,
  type GradeSchemeSpec,
} from "./gpa";

const STEPWISE: GradeSchemeSpec = {
  kind: "stepwise",
  boundaries: [
    { letter: "A", minPercent: 85, gradePoints: 4 },
    { letter: "B", minPercent: 70, gradePoints: 3 },
    { letter: "C", minPercent: 55, gradePoints: 2 },
    { letter: "F", minPercent: 0, gradePoints: 0 },
  ],
};

describe("gradePointsFor — official UET default table", () => {
  it("matches the UG Semester Regulations 2016 grade points", () => {
    expect(gradePointsFor(92, UET_DEFAULT_SCHEME)).toBe(4); // A+
    expect(gradePointsFor(85, UET_DEFAULT_SCHEME)).toBe(4); // A
    expect(gradePointsFor(82, UET_DEFAULT_SCHEME)).toBe(3.7); // A-
    expect(gradePointsFor(75, UET_DEFAULT_SCHEME)).toBe(3.3); // B+
    expect(gradePointsFor(70, UET_DEFAULT_SCHEME)).toBe(3.0); // B
    expect(gradePointsFor(60, UET_DEFAULT_SCHEME)).toBe(2.0); // C
    expect(gradePointsFor(50, UET_DEFAULT_SCHEME)).toBe(1.0); // D
  });

  it("maps A+ and A to the same grade points but different letters", () => {
    expect(letterFor(95, UET_DEFAULT_SCHEME)).toBe("A+");
    expect(letterFor(85, UET_DEFAULT_SCHEME)).toBe("A");
    expect(gradePointsFor(95, UET_DEFAULT_SCHEME)).toBe(
      gradePointsFor(85, UET_DEFAULT_SCHEME)
    );
  });

  it("fails below the pass mark", () => {
    expect(gradePointsFor(49.9, UET_DEFAULT_SCHEME)).toBe(0);
    expect(letterFor(30, UET_DEFAULT_SCHEME)).toBe("F");
    expect(gradePointsFor(0, UET_DEFAULT_SCHEME)).toBe(0);
  });
});

describe("linear (interpolated) schemes", () => {
  const LINEAR: GradeSchemeSpec = {
    kind: "linear",
    boundaries: UET_DEFAULT_SCHEME.boundaries,
    linear: { maxPercent: 85, maxGp: 4, perMarkDrop: 0.1, passPercent: 50, passGp: 1 },
  };

  it("interpolates between the max threshold and the pass floor", () => {
    expect(gradePointsFor(85, LINEAR)).toBe(4);
    expect(gradePointsFor(84, LINEAR)).toBeCloseTo(3.9);
    expect(gradePointsFor(75, LINEAR)).toBeCloseTo(3.0);
    expect(gradePointsFor(55, LINEAR)).toBeCloseTo(1.0); // clamped to floor
    expect(gradePointsFor(49.9, LINEAR)).toBe(0);
  });
});

describe("stepwise schemes", () => {
  it("uses the highest matching boundary", () => {
    expect(gradePointsFor(85, STEPWISE)).toBe(4);
    expect(gradePointsFor(84.9, STEPWISE)).toBe(3);
    expect(gradePointsFor(70, STEPWISE)).toBe(3);
    expect(gradePointsFor(54, STEPWISE)).toBe(0);
  });

  it("maps letters from boundaries", () => {
    expect(letterFor(90, STEPWISE)).toBe("A");
    expect(letterFor(60, STEPWISE)).toBe("C");
    expect(letterFor(10, STEPWISE)).toBe("F");
  });
});

describe("parseScheme", () => {
  it("falls back to the UET default on garbage", () => {
    expect(parseScheme(null)).toEqual(UET_DEFAULT_SCHEME);
    expect(parseScheme("not json")).toEqual(UET_DEFAULT_SCHEME);
    expect(parseScheme('{"kind":"nope"}')).toEqual(UET_DEFAULT_SCHEME);
  });

  it("round-trips a valid scheme", () => {
    expect(parseScheme(JSON.stringify(STEPWISE))).toEqual(STEPWISE);
  });
});

describe("courseStanding", () => {
  it("returns null percent with no graded assessments", () => {
    expect(
      courseStanding([{ obtained: null, total: 10, weight: 10 }])
    ).toEqual({ percent: null, gradedWeight: 0 });
    expect(courseStanding([])).toEqual({ percent: null, gradedWeight: 0 });
  });

  it("combines weight-proportionally when all assessments have weights", () => {
    // Quiz 8/10 (w10), Mid 30/50 (w30) → (0.8*10 + 0.6*30) / 40 = 65%
    const s = courseStanding([
      { obtained: 8, total: 10, weight: 10 },
      { obtained: 30, total: 50, weight: 30 },
      { obtained: null, total: 100, weight: 60 },
    ]);
    expect(s.percent).toBeCloseTo(65);
    expect(s.gradedWeight).toBeCloseTo(0.4);
  });

  it("uses raw mark totals when any weight is missing", () => {
    // 8/10 + 42/50 = 50/60 → 83.33%
    const s = courseStanding([
      { obtained: 8, total: 10, weight: null },
      { obtained: 42, total: 50, weight: null },
    ]);
    expect(s.percent).toBeCloseTo(83.33, 1);
  });
});

describe("weightedGpa", () => {
  const uet = () => UET_DEFAULT_SCHEME;

  it("weights by credit hours", () => {
    // 3cr at 85% (A, 4.0) + 1cr at 75% (B+, 3.3) → (12 + 3.3) / 4 = 3.83
    const { gpa, creditHours } = weightedGpa(
      [
        { creditHours: 3, percent: 85 },
        { creditHours: 1, percent: 75 },
      ],
      uet
    );
    expect(gpa).toBeCloseTo(3.83);
    expect(creditHours).toBe(4);
  });

  it("excludes ungraded and zero-credit courses", () => {
    const { gpa, creditHours } = weightedGpa(
      [
        { creditHours: 3, percent: 85 },
        { creditHours: 3, percent: null },
        { creditHours: 0, percent: 100 },
      ],
      uet
    );
    expect(gpa).toBe(4);
    expect(creditHours).toBe(3);
  });

  it("returns null when nothing is graded", () => {
    expect(weightedGpa([{ creditHours: 3, percent: null }], uet).gpa).toBeNull();
    expect(weightedGpa([], uet).gpa).toBeNull();
  });
});
