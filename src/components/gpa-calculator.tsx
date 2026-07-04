"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  RotateCcw,
  GraduationCap,
  Download,
  TrendingUp,
  TrendingDown,
  Layers,
} from "lucide-react";
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

interface Sem {
  id: string;
  name: string;
  rows: Row[];
}

export interface MyCourse {
  name: string;
  credits: number;
  grade: string;
  semester?: string | null;
}

const gpOf = (letter: string) =>
  UET_LETTER_GRADES.find((g) => g.letter === letter)?.gradePoints ?? null;
const isKnownGrade = (letter: string) => UET_LETTER_GRADES.some((g) => g.letter === letter);

let counter = 0;
const newRow = (): Row => ({ id: `r${counter++}`, name: "", creditHours: "3", grade: "A" });
const newSem = (name: string, rows?: Row[]): Sem => ({
  id: `s${counter++}`,
  name,
  rows: rows ?? [newRow(), newRow(), newRow()],
});

function agg(rows: Row[]) {
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
}

export function GpaCalculator({
  myCourses = [],
  priorCgpa = null,
  priorCredits = 0,
}: {
  myCourses?: MyCourse[];
  priorCgpa?: number | null;
  priorCredits?: number;
}) {
  const [sems, setSems] = useState<Sem[]>(() => [newSem("Semester 1")]);
  const [blend, setBlend] = useState(false);
  const [pCgpa, setPCgpa] = useState(priorCgpa != null ? priorCgpa.toFixed(2) : "");
  const [pCredits, setPCredits] = useState(priorCredits ? String(priorCredits) : "");

  const updateRow = (sid: string, rid: string, patch: Partial<Row>) =>
    setSems((ss) =>
      ss.map((s) =>
        s.id === sid ? { ...s, rows: s.rows.map((r) => (r.id === rid ? { ...r, ...patch } : r)) } : s
      )
    );
  const removeRow = (sid: string, rid: string) =>
    setSems((ss) =>
      ss.map((s) => (s.id === sid ? { ...s, rows: s.rows.filter((r) => r.id !== rid) } : s))
    );
  const addRow = (sid: string) =>
    setSems((ss) => ss.map((s) => (s.id === sid ? { ...s, rows: [...s.rows, newRow()] } : s)));
  const renameSem = (sid: string, name: string) =>
    setSems((ss) => ss.map((s) => (s.id === sid ? { ...s, name } : s)));
  const removeSem = (sid: string) =>
    setSems((ss) => (ss.length > 1 ? ss.filter((s) => s.id !== sid) : ss));
  const addSem = () => setSems((ss) => [...ss, newSem(`Semester ${ss.length + 1}`)]);
  const reset = () => setSems([newSem("Semester 1")]);

  const loadMine = () => {
    // group real courses by their semester, preserving first-seen order
    const groups = new Map<string, Row[]>();
    for (const c of myCourses) {
      const key = c.semester || "My courses";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push({
        id: `r${counter++}`,
        name: c.name,
        creditHours: String(c.credits),
        grade: isKnownGrade(c.grade) ? c.grade : "A",
      });
    }
    if (groups.size === 0) return;
    setSems(Array.from(groups.entries()).map(([name, rows]) => ({ id: `s${counter++}`, name, rows })));
  };

  const totals = useMemo(() => {
    let ch = 0;
    let qp = 0;
    for (const s of sems) {
      const a = agg(s.rows);
      ch += a.credits;
      qp += a.points;
    }
    return { gpa: ch > 0 ? qp / ch : null, credits: ch, points: qp };
  }, [sems]);

  // Blended CGPA: prior record + every entered course
  const combined = useMemo(() => {
    if (!blend) return null;
    const pc = parseFloat(pCgpa);
    const pcr = parseFloat(pCredits);
    if (!Number.isFinite(pc) || !Number.isFinite(pcr) || pcr < 0) return null;
    const totalCr = pcr + totals.credits;
    if (totalCr <= 0) return null;
    const cgpa = (pc * pcr + totals.points) / totalCr;
    const delta = Math.round((cgpa - pc) * 100) / 100 || 0; // || 0 kills negative zero
    return { cgpa, totalCr, delta };
  }, [blend, pCgpa, pCredits, totals]);

  const multi = sems.length > 1;
  const headline = combined ? combined.cgpa : totals.gpa;
  const headlineLabel = combined ? "New CGPA" : multi ? "Cumulative GPA" : "Semester GPA";

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Semester groups */}
      <div className="space-y-4 lg:col-span-2">
        {sems.map((s, si) => {
          const { gpa } = agg(s.rows);
          return (
            <Card key={s.id}>
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                <input
                  value={s.name}
                  onChange={(e) => renameSem(s.id, e.target.value)}
                  className="min-w-0 flex-1 rounded bg-transparent font-display text-[15px] font-semibold tracking-tight text-ink focus:outline-none focus:ring-2 focus:ring-[rgb(var(--accent-tint)/0.2)]"
                  aria-label={`Semester ${si + 1} name`}
                />
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-baseline gap-1">
                    <span className="stat-figure text-lg font-bold leading-none text-garnet-600">
                      {gpa != null ? gpa.toFixed(2) : "—"}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-ink-faint">GPA</span>
                  </span>
                  {multi ? (
                    <button
                      onClick={() => removeSem(s.id)}
                      aria-label={`Remove ${s.name}`}
                      className="grid size-7 place-items-center rounded-md text-ink-faint transition-colors hover:bg-fail-soft hover:text-fail"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : null}
                </div>
              </div>

              <CardBody className="p-0">
                <div className="grid grid-cols-[1fr_5.5rem_6rem_2rem] items-center gap-3 border-b border-line bg-canvas px-5 py-2 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
                  <span>Course</span>
                  <span>Credits</span>
                  <span>Grade</span>
                  <span />
                </div>
                <ul>
                  {s.rows.map((r, i) => {
                    const gp = gpOf(r.grade);
                    return (
                      <li
                        key={r.id}
                        className="grid grid-cols-[1fr_5.5rem_6rem_2rem] items-center gap-3 border-b border-line/70 px-5 py-2.5 last:border-0"
                      >
                        <Input
                          value={r.name}
                          onChange={(e) => updateRow(s.id, r.id, { name: e.target.value })}
                          placeholder={`Course ${i + 1}`}
                          className="h-9"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={r.creditHours}
                          onChange={(e) => updateRow(s.id, r.id, { creditHours: e.target.value })}
                          className="h-9 text-center"
                          aria-label="Credit hours"
                        />
                        <Select
                          value={r.grade}
                          onChange={(e) => updateRow(s.id, r.id, { grade: e.target.value })}
                          className="h-9"
                          aria-label="Grade"
                        >
                          {UET_LETTER_GRADES.map((g) => (
                            <option key={g.letter} value={g.letter}>
                              {g.letter} ({g.gradePoints.toFixed(1)})
                            </option>
                          ))}
                        </Select>
                        <button
                          onClick={() => removeRow(s.id, r.id)}
                          aria-label="Remove course"
                          disabled={s.rows.length <= 1}
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
                  <Button variant="secondary" size="sm" onClick={() => addRow(s.id)}>
                    <Plus size={14} /> Add course
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={addSem}>
            <Layers size={14} /> Add semester
          </Button>
          {myCourses.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={loadMine} title="Fill from your synced grades">
              <Download size={13} /> Load mine
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw size={13} /> Reset
          </Button>
        </div>
      </div>

      {/* Result + blend + scale — the whole rail sticks together */}
      <div className="lg:col-span-1">
        <div className="space-y-5 lg:sticky lg:top-8">
          <Card className="overflow-hidden">
            <div className="app-aura border-b border-line px-5 py-6 text-center">
              <p className="eyebrow">{headlineLabel}</p>
              <p className="stat-figure mt-1 text-6xl font-bold text-garnet-600">
                {headline != null ? headline.toFixed(2) : "—"}
              </p>
              {combined ? (
                <p
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-xs font-semibold",
                    combined.delta >= 0 ? "text-pass" : "text-fail"
                  )}
                >
                  {combined.delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {combined.delta >= 0 ? "+" : ""}
                  {combined.delta.toFixed(2)} · {multi ? "combined" : "sem"} GPA{" "}
                  {totals.gpa != null ? totals.gpa.toFixed(2) : "—"}
                </p>
              ) : (
                <p className="mt-1 text-xs text-ink-soft">
                  {totals.credits > 0
                    ? `${totals.points.toFixed(1)} points over ${totals.credits} credits${
                        multi ? ` · ${sems.length} semesters` : ""
                      }`
                    : "add a course to begin"}
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
                  <span
                    className={cn(
                      "font-semibold",
                      g.gradePoints >= 3 ? "text-pass" : g.gradePoints >= 2 ? "text-warn" : "text-fail"
                    )}
                  >
                    {g.letter}
                  </span>
                  <span className="stat-figure text-ink-soft">{g.gradePoints.toFixed(1)}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
