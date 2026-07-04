"use client";

import { useState, useTransition } from "react";
import { Check, X, Minus } from "lucide-react";
import { saveAttendance } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const THRESHOLD = 75; // UET debar threshold

export function AttendanceTracker({
  courseId,
  initialHeld,
  initialAttended,
}: {
  courseId: string;
  initialHeld: number;
  initialAttended: number;
}) {
  const [held, setHeld] = useState(initialHeld);
  const [attended, setAttended] = useState(initialAttended);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const persist = (h: number, a: number) =>
    start(() => {
      void saveAttendance(courseId, h, a);
    });

  const present = () => {
    const h = held + 1;
    const a = attended + 1;
    setHeld(h);
    setAttended(a);
    setDirty(false);
    persist(h, a);
  };
  const absent = () => {
    const h = held + 1;
    setHeld(h);
    setDirty(false);
    persist(h, attended);
  };
  const undo = () => {
    const h = Math.max(0, held - 1);
    const a = Math.min(attended, h);
    setHeld(h);
    setAttended(a);
    setDirty(false);
    persist(h, a);
  };
  const save = () => {
    setDirty(false);
    persist(held, attended);
  };

  const a = Math.min(attended, held);
  const pct = held > 0 ? (a / held) * 100 : null;
  const tone = pct == null ? "neutral" : pct >= THRESHOLD + 5 ? "pass" : pct >= THRESHOLD ? "warn" : "fail";
  const toneText = { pass: "text-pass", warn: "text-warn", fail: "text-fail", neutral: "text-ink" }[tone];
  const toneBar = { pass: "bg-pass", warn: "bg-warn", fail: "bg-fail", neutral: "bg-line-strong" }[tone];

  // How many more classes you can miss and stay ≥ THRESHOLD, or must attend to recover.
  const maxSkip = held > 0 ? Math.floor((a * 100) / THRESHOLD - held) : null;
  const needAttend =
    pct != null && pct < THRESHOLD ? Math.ceil((THRESHOLD * held - 100 * a) / (100 - THRESHOLD)) : 0;

  let message: React.ReactNode = null;
  if (held === 0) {
    message = "Log a class with Present or Absent to start tracking.";
  } else if (pct != null && pct >= THRESHOLD) {
    message =
      maxSkip && maxSkip > 0 ? (
        <>
          You can miss <b className="text-ink">{maxSkip}</b> more and stay above {THRESHOLD}%.
        </>
      ) : (
        <>You&apos;re right at the {THRESHOLD}% line — don&apos;t miss the next one.</>
      );
  } else {
    message = (
      <>
        Below {THRESHOLD}%. Attend the next <b className="text-fail">{needAttend}</b> in a row to
        recover.
      </>
    );
  }

  return (
    <div className={cn("space-y-4", pending && "opacity-80 transition-opacity")}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={cn("stat-figure text-4xl font-bold leading-none", toneText)}>
            {pct != null ? `${Math.round(pct)}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            {a} attended · {held} held
          </p>
        </div>
        <p className={cn("max-w-[16rem] text-right text-xs leading-relaxed", pct != null && pct < THRESHOLD ? "text-fail" : "text-ink-soft")}>
          {message}
        </p>
      </div>

      {/* Bar with the 75% threshold marker */}
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-line/70">
        <div
          className={cn("h-full rounded-full transition-all", toneBar)}
          style={{ width: `${Math.min(100, pct ?? 0)}%` }}
        />
        <span
          className="absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-ink/40"
          style={{ left: `${THRESHOLD}%` }}
          title={`${THRESHOLD}% threshold`}
        />
      </div>

      {/* Quick log */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={present} disabled={pending}>
          <Check size={14} /> Present
        </Button>
        <Button size="sm" variant="secondary" onClick={absent} disabled={pending}>
          <X size={14} /> Absent
        </Button>
        <Button size="sm" variant="ghost" onClick={undo} disabled={pending || held === 0}>
          <Minus size={14} /> Undo class
        </Button>
      </div>

      {/* Manual correction */}
      <details className="group">
        <summary className="cursor-pointer list-none text-[11px] font-semibold uppercase tracking-wide text-ink-faint hover:text-ink">
          Set counts manually
        </summary>
        <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-line/70 pt-3">
          <label className="text-xs font-medium text-ink-soft">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">Attended</span>
            <Input
              type="number"
              min="0"
              value={attended}
              onChange={(e) => {
                setAttended(Math.max(0, parseInt(e.target.value, 10) || 0));
                setDirty(true);
              }}
              className="h-9 w-24"
            />
          </label>
          <label className="text-xs font-medium text-ink-soft">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-ink-faint">Held</span>
            <Input
              type="number"
              min="0"
              value={held}
              onChange={(e) => {
                setHeld(Math.max(0, parseInt(e.target.value, 10) || 0));
                setDirty(true);
              }}
              className="h-9 w-24"
            />
          </label>
          <Button size="sm" variant="secondary" onClick={save} disabled={pending || !dirty}>
            Save counts
          </Button>
        </div>
      </details>
    </div>
  );
}
