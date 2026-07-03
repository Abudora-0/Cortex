"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, RotateCcw, GraduationCap, Download, TrendingUp, TrendingDown } from "lucide-react";
import { UET_LETTER_GRADES } from "@/lib/gpa";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  name: string;
  creditHours: string;
  grade: string;
}

export interface MyCourse {
  name: string;
  credits: number;
  grade: string;
}

const gpOf = (letter: string) =>
  UET_LETTER_GRADES.find((g) => g.letter === letter)?.gradePoints ?? null;
const isKnownGrade = (letter: string) => UET_LETTER_GRADES.some((g) => g.letter === letter);

let counter = 0;
const newRow = (): Row => ({ id: `r${counter++}`, name: "", creditHours: "3", grade: "A" });

export function GpaCalculator({
  myCourses = [],
  priorCgpa = null,
  priorCredits = 0,
}: {
  myCourses?: MyCourse[];
  priorCgpa?: number | null;
  priorCredits?: number;
}) {
  const [rows, setRows] = useState<Row[]>(() => [newRow(), newRow(), newRow()]);
  const [blend, setBlend] = useState(false);
  const [pCgpa, setPCgpa] = useState(priorCgpa != null ? priorCgpa.toFixed(2) : "");
  const [pCredits, setPCredits] = useState(priorCredits ? String(priorCredits) : "");

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  const loadMine = () =>
    setRows(
      myCourses.map((c) => ({
        id: `r${counter++}`,
        name: c.name,
        creditHours: String(c.credits),
        grade: isKnownGrade(c.grade) ? c.grade : "A",
      }))
    );

  const { gpa, credits, points } = useMemo(() => {
    let ch = 0;
    let qp = 0;
    for (const r of rows) {
      const c = parseFloat(r.creditHours);
      const gp = gpOf(r.grade);
      if (!Number.isFinite(c) || c <= 0 || gp == null) continue;
      ch += c;
      qp += gp * c;
    }
    return { gpa: ch > 0 ? qp / ch : null, credits: ch, points: qp };
  }, [rows]);

  // Blended CGPA: prior record + the entered courses
  const combined = useMemo(() => {
    if (!blend) return null;
    const pc = parseFloat(pCgpa);
    const pcr = parseFloat(pCredits);
    if (!Number.isFinite(pc) || !Number.isFinite(pcr) || pcr < 0) return null;
    const totalCr = pcr + credits;
    if (totalCr <= 0) return null;
    const cgpa = (pc * pcr + points) / totalCr;
    const delta = Math.round((cgpa - pc) * 100) / 100 || 0; // || 0 kills negative zero
    return { cgpa, totalCr, delta };
  }, [blend, pCgpa, pCredits, credits, points]);

  const headline = combined ? combined.cgpa : gpa;
  const headlineLabel = combined ? "New CGPA" : "Semester GPA";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Course rows */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title="Your courses"
            hint="pick a grade and credit hours for each"
            action={
              <div className="flex items-center gap-1">
                {myCourses.length > 0 ? (
                  <Button variant="ghost" size="sm" onClick={loadMine} title="Fill from your synced grades">
                    <Download size={13} /> Load mine
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={() => setRows([newRow(), newRow(), newRow()])}>
                  <RotateCcw size={13} /> Reset
                </Button>
              </div>
            }
          />
          <CardBody className="p-0">
            <div className="grid grid-cols-[1fr_5.5rem_6rem_2rem] items-center gap-3 border-b border-line bg-canvas px-5 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
              <span>Course</span>
              <span>Credits</span>
              <span>Grade</span>
              <span />
            </div>
            <ul>
              {rows.map((r, i) => {
                const gp = gpOf(r.grade);
                return (
                  <li
                    key={r.id}
                    className="grid grid-cols-[1fr_5.5rem_6rem_2rem] items-center gap-3 border-b border-line/70 px-5 py-2.5 last:border-0"
                  >
                    <Input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} placeholder={`Course ${i + 1}`} className="h-9" />
                    <Input type="number" min="0" step="0.5" value={r.creditHours} onChange={(e) => update(r.id, { creditHours: e.target.value })} className="h-9 text-center" aria-label="Credit hours" />
                    <Select value={r.grade} onChange={(e) => update(r.id, { grade: e.target.value })} className="h-9" aria-label="Grade">
                      {UET_LETTER_GRADES.map((g) => (
                        <option key={g.letter} value={g.letter}>
                          {g.letter} ({g.gradePoints.toFixed(1)})
                        </option>
                      ))}
                    </Select>
                    <button
                      onClick={() => remove(r.id)}
                      aria-label="Remove course"
                      disabled={rows.length <= 1}
                      className="grid size-8 place-items-center rounded-md text-ink-faint transition-colors hover:bg-fail-soft hover:text-fail disabled:pointer-events-none disabled:opacity-30"
                      title={gp != null ? `${gp.toFixed(1)} grade points` : ""}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="px-5 py-3">
              <Button variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, newRow()])}>
                <Plus size={14} /> Add course
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Result + blend + scale */}
      <div className="space-y-5">
        <Card className="sticky top-8 overflow-hidden">
          <div className="app-aura border-b border-line px-5 py-6 text-center">
            <p className="eyebrow">{headlineLabel}</p>
            <p className="stat-figure mt-1 text-6xl font-bold text-garnet-600">
              {headline != null ? headline.toFixed(2) : "—"}
            </p>
            {combined ? (
              <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-semibold", combined.delta >= 0 ? "text-pass" : "text-fail")}>
                {combined.delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {combined.delta >= 0 ? "+" : ""}
                {combined.delta.toFixed(2)} · sem GPA {gpa != null ? gpa.toFixed(2) : "—"}
              </p>
            ) : (
              <p className="mt-1 text-xs text-ink-soft">
                {credits > 0 ? `${points.toFixed(1)} points over ${credits} credits` : "add a course to begin"}
              </p>
            )}
          </div>

          {/* Blend with record */}
          <div className="border-b border-line px-5 py-4">
            <button
              onClick={() => setBlend((b) => !b)}
              className="flex w-full items-center justify-between gap-2 text-left"
              aria-pressed={blend}
            >
              <span className="text-sm font-medium text-ink">Blend with my record</span>
              <span
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                  blend ? "bg-garnet-600" : "bg-line-strong"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
                    blend ? "left-[1.125rem]" : "left-0.5"
                  )}
                />
              </span>
            </button>
            {blend ? (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Current CGPA
                  </label>
                  <Input value={pCgpa} onChange={(e) => setPCgpa(e.target.value)} type="number" step="0.01" min="0" max="4" className="h-9" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                    Credits done
                  </label>
                  <Input value={pCredits} onChange={(e) => setPCredits(e.target.value)} type="number" step="1" min="0" className="h-9" />
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] leading-relaxed text-ink-faint">
                See your new CGPA if you take these courses on top of your current record.
              </p>
            )}
          </div>

          <CardBody className="flex items-center gap-2 text-xs text-ink-soft">
            <GraduationCap size={15} className="shrink-0 text-garnet-600" />
            UET grades relatively — treat this as an estimate against known letter grades.
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Grade scale" hint="UET grade points" />
          <CardBody className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            {UET_LETTER_GRADES.map((g) => (
              <div key={g.letter} className="flex items-center justify-between">
                <span className={cn("font-semibold", g.gradePoints >= 3 ? "text-pass" : g.gradePoints >= 2 ? "text-warn" : "text-fail")}>
                  {g.letter}
                </span>
                <span className="stat-figure text-ink-soft">{g.gradePoints.toFixed(1)}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
