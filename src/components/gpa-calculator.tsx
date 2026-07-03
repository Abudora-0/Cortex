"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, RotateCcw, GraduationCap } from "lucide-react";
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

const gpOf = (letter: string) =>
  UET_LETTER_GRADES.find((g) => g.letter === letter)?.gradePoints ?? null;

let counter = 0;
const newRow = (): Row => ({
  id: `r${counter++}`,
  name: "",
  creditHours: "3",
  grade: "A",
});

export function GpaCalculator() {
  const [rows, setRows] = useState<Row[]>(() => [newRow(), newRow(), newRow()]);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

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

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Course rows */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader
            title="Your courses"
            hint="pick a grade and credit hours for each"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRows([newRow(), newRow(), newRow()])}
              >
                <RotateCcw size={13} /> Reset
              </Button>
            }
          />
          <CardBody className="p-0">
            {/* header row */}
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
                    <Input
                      value={r.name}
                      onChange={(e) => update(r.id, { name: e.target.value })}
                      placeholder={`Course ${i + 1}`}
                      className="h-9"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={r.creditHours}
                      onChange={(e) => update(r.id, { creditHours: e.target.value })}
                      className="h-9 text-center"
                      aria-label="Credit hours"
                    />
                    <Select
                      value={r.grade}
                      onChange={(e) => update(r.id, { grade: e.target.value })}
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

      {/* Result + scale */}
      <div className="space-y-5">
        <Card className="sticky top-8 overflow-hidden">
          <div className="app-aura border-b border-line px-5 py-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
              Your GPA
            </p>
            <p className="stat-figure mt-1 text-6xl font-bold text-garnet-600">
              {gpa != null ? gpa.toFixed(2) : "—"}
            </p>
            <p className="mt-1 text-xs text-ink-soft">
              {credits > 0
                ? `${points.toFixed(1)} points over ${credits} credit hours`
                : "add a course to begin"}
            </p>
          </div>
          <CardBody className="flex items-center gap-2 text-xs text-ink-soft">
            <GraduationCap size={15} className="shrink-0 text-garnet-600" />
            Based on UET grade points. Since UET grades relatively, use this as an
            estimate against known letter grades.
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
  );
}
