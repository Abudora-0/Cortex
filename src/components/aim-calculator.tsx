"use client";

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";

export function AimCalculator({
  defaultCgpa,
  defaultCredits,
}: {
  defaultCgpa: number | null;
  defaultCredits: number;
}) {
  const [cgpa, setCgpa] = useState(defaultCgpa != null ? defaultCgpa.toFixed(2) : "");
  const [completed, setCompleted] = useState(defaultCredits ? String(defaultCredits) : "");
  const [target, setTarget] = useState("3.50");
  const [semCredits, setSemCredits] = useState("15");

  const result = useMemo(() => {
    const c = parseFloat(cgpa);
    const done = parseFloat(completed);
    const t = parseFloat(target);
    const sc = parseFloat(semCredits);
    if (![c, done, t, sc].every(Number.isFinite) || sc <= 0 || done < 0) return null;
    // t = (c*done + need*sc) / (done + sc)  →  solve for need
    const need = (t * (done + sc) - c * done) / sc;
    return { need, round: Math.round(need * 100) / 100 };
  }, [cgpa, completed, target, semCredits]);

  const status =
    result == null
      ? null
      : result.need > 4.0
        ? { tone: "fail", text: "Out of reach — a 4.00 semester still falls short of this target." }
        : result.need <= 0
          ? { tone: "pass", text: "Already secured — even a 0.00 this semester keeps you above the target." }
          : { tone: "ok", text: "Achievable — aim for this semester GPA or higher." };

  return (
    <Card>
      <CardHeader
        title="Reach a target CGPA"
        hint="what you need this semester"
        action={<Target size={16} className="text-garnet-600" />}
      />
      <CardBody className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Current CGPA">
            <Input value={cgpa} onChange={(e) => setCgpa(e.target.value)} type="number" step="0.01" min="0" max="4" placeholder="3.20" />
          </Field>
          <Field label="Credits done">
            <Input value={completed} onChange={(e) => setCompleted(e.target.value)} type="number" step="1" min="0" placeholder="33" />
          </Field>
          <Field label="Target CGPA">
            <Input value={target} onChange={(e) => setTarget(e.target.value)} type="number" step="0.01" min="0" max="4" />
          </Field>
          <Field label="This sem credits">
            <Input value={semCredits} onChange={(e) => setSemCredits(e.target.value)} type="number" step="1" min="1" />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-canvas/60 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
              Required semester GPA
            </p>
            <p className="stat-figure text-4xl font-bold text-garnet-600">
              {result == null
                ? "—"
                : result.need <= 0
                  ? "0.00"
                  : result.need > 4
                    ? `${result.round.toFixed(2)}`
                    : result.round.toFixed(2)}
            </p>
          </div>
          {status ? (
            <p
              className={
                "max-w-xs text-xs leading-relaxed " +
                (status.tone === "fail"
                  ? "text-fail"
                  : status.tone === "pass"
                    ? "text-pass"
                    : "text-ink-soft")
              }
            >
              {status.text}
            </p>
          ) : (
            <p className="text-xs text-ink-faint">Fill in the four fields to see your target.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
