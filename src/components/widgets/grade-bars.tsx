import { cn } from "@/lib/utils";

export interface GradeBucket {
  letter: string;
  count: number;
  gp: number;
}

function tone(gp: number) {
  if (gp >= 3) return "bg-pass";
  if (gp >= 2) return "bg-warn";
  return "bg-fail";
}

/** Horizontal grade-distribution bars (CSS grow-in, staggered). */
export function GradeBars({ buckets }: { buckets: GradeBucket[] }) {
  if (buckets.length === 0) {
    return <p className="text-xs text-ink-faint">No graded courses yet.</p>;
  }
  const max = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-2">
      {buckets.map((b, i) => (
        <div key={b.letter} className="flex items-center gap-3">
          <span className="stat-figure w-7 shrink-0 text-left text-sm font-bold text-ink">
            {b.letter}
          </span>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-line/60">
            <div
              className={cn("grow-x h-full rounded-full", tone(b.gp))}
              style={{ width: `${(b.count / max) * 100}%`, ["--d" as string]: `${0.15 + i * 0.07}s` }}
            />
          </div>
          <span className="stat-figure w-5 shrink-0 text-xs font-semibold text-ink-soft">
            {b.count}
          </span>
        </div>
      ))}
    </div>
  );
}
