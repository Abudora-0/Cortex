"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Lock, TrendingUp, TrendingDown } from "lucide-react";
import { gradePointsFor, letterFor, type GradeSchemeSpec } from "@/lib/gpa";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

export interface WhatIfCourse {
  id: string;
  title: string;
  code: string | null;
  creditHours: number;
  /** Actual current percent, null if ungraded */
  percent: number | null;
  scheme: GradeSchemeSpec;
  /** LMS courses carry an official, relatively-graded result that is locked. */
  fromLms: boolean;
  fixedGradePoints: number | null;
  fixedLetter: string | null;
}

export interface WhatIfSemester {
  id: string;
  name: string;
  courses: WhatIfCourse[];
}

function aggregate(pairs: { ch: number; gp: number | null }[]) {
  const graded = pairs.filter((p) => p.gp != null && p.ch > 0);
  const ch = graded.reduce((s, p) => s + p.ch, 0);
  if (ch === 0) return null;
  const pts = graded.reduce((s, p) => s + p.gp! * p.ch, 0);
  return Math.round((pts / ch) * 100) / 100;
}

export function WhatIfLab({ semesters }: { semesters: WhatIfSemester[] }) {
  // Overrides: courseId -> hypothetical percent (manual courses only)
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const allCourses = useMemo(() => semesters.flatMap((s) => s.courses), [semesters]);

  const effectivePercent = (c: WhatIfCourse) => overrides[c.id] ?? c.percent;

  // Grade points for a course given current slider state.
  const projectedGp = (c: WhatIfCourse): number | null => {
    if (c.fromLms) return c.fixedGradePoints; // locked, official
    const p = effectivePercent(c);
    return p != null ? gradePointsFor(p, c.scheme) : null;
  };
  const actualGp = (c: WhatIfCourse): number | null => {
    if (c.fromLms) return c.fixedGradePoints;
    return c.percent != null ? gradePointsFor(c.percent, c.scheme) : null;
  };

  const projected = useMemo(
    () => aggregate(allCourses.map((c) => ({ ch: c.creditHours, gp: projectedGp(c) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allCourses, overrides]
  );
  const actual = useMemo(
    () => aggregate(allCourses.map((c) => ({ ch: c.creditHours, gp: actualGp(c) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allCourses]
  );
  const delta = projected != null && actual != null ? projected - actual : null;
  const anyManual = allCourses.some((c) => !c.fromLms);

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {semesters.map((sem) => {
          const semGpa = aggregate(sem.courses.map((c) => ({ ch: c.creditHours, gp: projectedGp(c) })));
          return (
            <Card key={sem.id}>
              <CardHeader
                title={sem.name}
                action={
                  <span className="stat-figure text-lg font-bold text-garnet-600">
                    {semGpa != null ? semGpa.toFixed(2) : "—"}
                  </span>
                }
              />
              <CardBody className="space-y-4">
                {sem.courses.length === 0 ? (
                  <p className="text-xs text-ink-faint">No courses in this semester.</p>
                ) : (
                  sem.courses.map((c) => {
                    // LMS courses: locked official result, no slider.
                    if (c.fromLms) {
                      return (
                        <div key={c.id} className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium text-ink">
                            {c.code ? `${c.code} · ` : ""}
                            {c.title}
                            <span className="ml-2 text-[11px] text-ink-faint">
                              {c.creditHours} cr
                            </span>
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            <Chip tone="garnet">
                              {c.fixedLetter ?? "—"}
                              {c.fixedGradePoints != null ? ` · ${c.fixedGradePoints.toFixed(2)}` : ""}
                            </Chip>
                            <Lock size={13} className="text-ink-faint" />
                          </div>
                        </div>
                      );
                    }

                    const val = effectivePercent(c);
                    const overridden = overrides[c.id] != null;
                    return (
                      <div key={c.id}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium text-ink">
                            {c.code ? `${c.code} · ` : ""}
                            {c.title}
                            <span className="ml-2 text-[11px] text-ink-faint">
                              {c.creditHours} cr
                            </span>
                          </p>
                          <div className="flex shrink-0 items-center gap-2">
                            {val != null ? (
                              <Chip tone={overridden ? "brass" : "neutral"}>
                                {letterFor(val, c.scheme)} · {gradePointsFor(val, c.scheme).toFixed(2)}
                              </Chip>
                            ) : (
                              <Chip>ungraded</Chip>
                            )}
                            <span className="stat-figure w-14 text-right text-sm font-bold text-ink">
                              {val != null ? `${Math.round(val)}%` : "—"}
                            </span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={val ?? 0}
                          onChange={(e) =>
                            setOverrides((o) => ({ ...o, [c.id]: parseInt(e.target.value, 10) }))
                          }
                          className="u-range w-full"
                          style={{ ["--fill" as string]: `${val ?? 0}%` }}
                          aria-label={`Hypothetical percent for ${c.title}`}
                        />
                      </div>
                    );
                  })
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div>
        <Card className="sticky top-8">
          <CardHeader title="Projection" hint="drag sliders to explore" />
          <CardBody className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
                Projected CGPA
              </p>
              <p className="stat-figure text-5xl font-bold text-ink">
                {projected != null ? projected.toFixed(2) : "—"}
              </p>
              {delta != null && Math.abs(delta) >= 0.005 ? (
                <p className={"mt-1 inline-flex items-center gap-1 text-xs font-semibold " + (delta > 0 ? "text-pass" : "text-fail")}>
                  {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {Math.abs(delta).toFixed(2)} vs current
                  {actual != null ? ` (${actual.toFixed(2)})` : ""}
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-faint">
                  current: {actual != null ? actual.toFixed(2) : "—"}
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOverrides({})}
              disabled={Object.keys(overrides).length === 0}
            >
              <RotateCcw size={13} /> Reset to actual marks
            </Button>
            <p className="text-[11px] leading-relaxed text-ink-faint">
              {anyManual
                ? "Manual courses use your grading scheme; ungraded ones count once you set a mark. "
                : ""}
              Courses marked with a lock are official LMS results and can&apos;t be changed.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
