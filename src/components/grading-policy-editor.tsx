"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { saveGradingPolicy } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PolicyRow {
  label: string;
  weight: number;
}

const HUES = [349, 27, 152, 199, 262, 322];
let pid = 0;
const mkRow = (label = "", weight = "") => ({ id: `p${pid++}`, label, weight });

export function GradingPolicyEditor({
  courseId,
  initial,
}: {
  courseId: string;
  initial: PolicyRow[];
}) {
  const [rows, setRows] = useState(() =>
    initial.length
      ? initial.map((r) => mkRow(r.label, String(r.weight)))
      : [mkRow("Quizzes", "15"), mkRow("Assignments", "10"), mkRow("Midterm", "25"), mkRow("Final", "50")]
  );
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const mutate = (fn: (r: typeof rows) => typeof rows) => {
    setRows(fn);
    setDirty(true);
  };
  const update = (id: string, patch: Partial<{ label: string; weight: string }>) =>
    mutate((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => mutate((rs) => rs.filter((r) => r.id !== id));
  const add = () => mutate((rs) => [...rs, mkRow()]);

  const weights = rows.map((r) => parseFloat(r.weight) || 0);
  const total = weights.reduce((s, w) => s + w, 0);
  const balanced = Math.abs(total - 100) < 0.01;

  const save = () =>
    start(async () => {
      const payload = rows
        .filter((r) => r.label.trim())
        .map((r) => ({ label: r.label.trim(), weight: parseFloat(r.weight) || 0 }));
      await saveGradingPolicy(courseId, JSON.stringify(payload));
      setDirty(false);
    });

  return (
    <div className="space-y-4">
      {/* Proportional bar */}
      {total > 0 ? (
        <div className="flex h-2.5 overflow-hidden rounded-full bg-line">
          {rows.map((r, i) => {
            const w = (parseFloat(r.weight) || 0) / total;
            if (w <= 0) return null;
            return (
              <div
                key={r.id}
                style={{ width: `${w * 100}%`, background: `hsl(${HUES[i % HUES.length]} 62% 52%)` }}
                title={`${r.label || "—"} · ${r.weight || 0}%`}
              />
            );
          })}
        </div>
      ) : null}

      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: `hsl(${HUES[i % HUES.length]} 62% 52%)` }}
            />
            <Input
              value={r.label}
              onChange={(e) => update(r.id, { label: e.target.value })}
              placeholder="Component (e.g. Midterm)"
              className="h-9 flex-1"
            />
            <div className="relative w-24 shrink-0">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={r.weight}
                onChange={(e) => update(r.id, { weight: e.target.value })}
                className="h-9 pr-6 text-right"
                aria-label="Weight"
              />
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-faint">
                %
              </span>
            </div>
            <button
              onClick={() => remove(r.id)}
              aria-label="Remove component"
              disabled={rows.length <= 1}
              className="grid size-8 shrink-0 place-items-center rounded-md text-ink-faint transition-colors hover:bg-fail-soft hover:text-fail disabled:pointer-events-none disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" size="sm" onClick={add}>
          <Plus size={14} /> Add component
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-soft">
            Total{" "}
            <b className={cn("stat-figure", balanced ? "text-pass" : "text-warn")}>
              {total % 1 === 0 ? total : total.toFixed(1)}%
            </b>
          </span>
          <Button size="sm" onClick={save} disabled={pending || !dirty}>
            {dirty ? "Save" : (
              <>
                <Check size={13} /> Saved
              </>
            )}
          </Button>
        </div>
      </div>
      {!balanced && total > 0 ? (
        <p className="text-[11px] text-warn">Weights add up to {total % 1 === 0 ? total : total.toFixed(1)}%, not 100%.</p>
      ) : null}
    </div>
  );
}
