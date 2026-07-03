"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Lock, TrendingUp, TrendingDown, Plus, Trash2, FlaskConical } from "lucide-react";
import { gradePointsFor, letterFor, UET_LETTER_GRADES, type GradeSchemeSpec } from "@/lib/gpa";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface WhatIfCourse {
  id: string;
  title: string;
  code: string | null;
  creditHours: number;
  percent: number | null;
  scheme: GradeSchemeSpec;
  fromLms: boolean;
  fixedGradePoints: number | null;
  fixedLetter: string | null;
}

export interface WhatIfSemester {
  id: string;
  name: string;
  courses: WhatIfCourse[];
}

interface HypoCourse {
  id: string;
  credits: string;
  grade: string;
}

const gpOf = (letter: string) =>
  UET_LETTER_GRADES.find((g) => g.letter === letter)?.gradePoints ?? 0;

let hid = 0;
const newHypo = (grade = "A"): HypoCourse => ({ id: `h${hid++}`, credits: "3", grade });

function aggregate(pairs: { ch: number; gp: number | null }[]) {
  const graded = pairs.filter((p) => p.gp != null && p.ch > 0);
  const ch = graded.reduce((s, p) => s + p.ch, 0);
  if (ch === 0) return null;
  const pts = graded.reduce((s, p) => s + p.gp! * p.ch, 0);
  return Math.round((pts / ch) * 100) / 100;
}

const PRESETS = ["A", "A-", "B+", "B"];

export function WhatIfLab({ semesters }: { semesters: WhatIfSemester[] }) {
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [hypos, setHypos] = useState<HypoCourse[]>([]);
  const allCourses = useMemo(() => semesters.flatMap((s) => s.courses), [semesters]);

  const effectivePercent = (c: WhatIfCourse) => overrides[c.id] ?? c.percent;
  const projectedGp = (c: WhatIfCourse): number | null => {
    if (c.fromLms) return c.fixedGradePoints;
    const p = effectivePercent(c);
    return p != null ? gradePointsFor(p, c.scheme) : null;
  };
  const actualGp = (c: WhatIfCourse): number | null =>
    c.fromLms ? c.fixedGradePoints : c.percent != null ? gradePointsFor(c.percent, c.scheme) : null;

  const hypoPairs = hypos.map((h) => ({ ch: parseFloat(h.credits) || 0, gp: gpOf(h.grade) }));
  const currentProjected = allCourses.map((c) => ({ ch: c.creditHours, gp: projectedGp(c) }));
  const currentActual = allCourses.map((c) => ({ ch: c.creditHours, gp: actualGp(c) }));

  const actual = useMemo(() => aggregate(currentActual), [currentActual]);
  const projected = aggregate([...currentProjected, ...hypoPairs]);
  const plannedGpa = aggregate(hypoPairs);
  const projectedCredits = [...currentProjected, ...hypoPairs]
    .filter((p) => p.gp != null && p.ch > 0)
    .reduce((s, p) => s + p.ch, 0);
  const delta = projected != null && actual != null ? Math.round((projected - actual) * 100) / 100 : null;

  const anyManual = allCourses.some((c) => !c.fromLms);
  const dirty = Object.keys(overrides).length > 0 || hypos.length > 0;

  const setAllHypoGrades = (grade: string) =>
    setHypos((hs) => hs.map((h) => ({ ...h, grade })));

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        {/* Current courses */}
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
                    if (c.fromLms) {
                      return (
                        <div key={c.id} className="flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-medium text-ink">
                            {c.code ? `${c.code} · ` : ""}
                            {c.title}
                            <span className="ml-2 text-[11px] text-ink-faint">{c.creditHours} cr</span>
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
                            <span className="ml-2 text-[11px] text-ink-faint">{c.creditHours} cr</span>
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
                          onChange={(e) => setOverrides((o) => ({ ...o, [c.id]: parseInt(e.target.value, 10) }))}
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

        {/* Plan ahead — the unique projector */}
        <Card interactive className="border-garnet-200">
          <CardHeader
            title="Plan ahead"
            hint="add future courses to project your CGPA"
            action={
              plannedGpa != null ? (
                <span className="text-xs text-ink-soft">
                  planned GPA <b className="stat-figure text-garnet-600">{plannedGpa.toFixed(2)}</b>
                </span>
              ) : (
                <FlaskConical size={16} className="text-garnet-600" />
              )
            }
          />
          <CardBody className="space-y-3">
            {hypos.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    Set all to
                  </span>
                  {PRESETS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setAllHypoGrades(g)}
                      className="rounded-md border border-line-strong bg-paper px-2 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink hover:bg-canvas"
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <ul className="space-y-2">
                  {hypos.map((h, i) => (
                    <li key={h.id} className="flex items-center gap-2">
                      <span className="stat-figure w-5 text-xs text-ink-faint">{i + 1}</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={h.credits}
                        onChange={(e) =>
                          setHypos((hs) => hs.map((x) => (x.id === h.id ? { ...x, credits: e.target.value } : x)))
                        }
                        className="h-9 w-20 text-center"
                        aria-label="Credit hours"
                      />
                      <span className="text-xs text-ink-faint">cr</span>
                      <Select
                        value={h.grade}
                        onChange={(e) =>
                          setHypos((hs) => hs.map((x) => (x.id === h.id ? { ...x, grade: e.target.value } : x)))
                        }
                        className="h-9 flex-1"
                        aria-label="Grade"
                      >
                        {UET_LETTER_GRADES.map((g) => (
                          <option key={g.letter} value={g.letter}>
                            {g.letter} ({g.gradePoints.toFixed(1)})
                          </option>
                        ))}
                      </Select>
                      <button
                        onClick={() => setHypos((hs) => hs.filter((x) => x.id !== h.id))}
                        aria-label="Remove"
                        className="grid size-8 place-items-center rounded-md text-ink-faint transition-colors hover:bg-fail-soft hover:text-fail"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-ink-soft">
                Since your synced courses are locked, this is where the lab shines — add the
                courses you&apos;ll take next term with target grades and see where your CGPA lands.
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setHypos((hs) => [...hs, newHypo()])}>
                <Plus size={14} /> Add course
              </Button>
              {hypos.length > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setHypos((hs) => [...hs, newHypo(), newHypo(), newHypo(), newHypo(), newHypo()])}
                >
                  + full semester
                </Button>
              ) : null}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Projection rail */}
      <div>
        <Card className="app-aura sticky top-8">
          <CardHeader title="Projection" hint="updates live" />
          <CardBody className="space-y-5">
            <div>
              <p className="eyebrow">Projected CGPA</p>
              <p className="stat-figure text-[3.25rem] font-bold leading-none text-garnet-600">
                {projected != null ? projected.toFixed(2) : "—"}
              </p>
              {delta != null && Math.abs(delta) >= 0.005 ? (
                <p className={cn("mt-2 inline-flex items-center gap-1 text-xs font-semibold", delta > 0 ? "text-pass" : "text-fail")}>
                  {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(2)} from {actual != null ? actual.toFixed(2) : "—"}
                </p>
              ) : (
                <p className="mt-2 text-xs text-ink-faint">
                  current: {actual != null ? actual.toFixed(2) : "—"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-line pt-4">
              <div>
                <p className="stat-figure text-xl font-bold text-ink">{projectedCredits}</p>
                <p className="text-[10px] uppercase tracking-widest text-ink-faint">Total credits</p>
              </div>
              <div>
                <p className="stat-figure text-xl font-bold text-ink">
                  {plannedGpa != null ? plannedGpa.toFixed(2) : "—"}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-ink-faint">Planned GPA</p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setOverrides({});
                setHypos([]);
              }}
              disabled={!dirty}
            >
              <RotateCcw size={13} /> Reset
            </Button>
            <p className="text-[11px] leading-relaxed text-ink-faint">
              {anyManual ? "Drag ungraded courses to test marks. " : ""}
              Locked courses are official LMS results. Add future courses under
              &ldquo;Plan ahead&rdquo; to project forward.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
