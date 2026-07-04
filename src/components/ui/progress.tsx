import { cn } from "@/lib/utils";

/** Segmented progress bar - filled/total discrete blocks. */
export function SegmentedProgress({
  filled,
  total,
  tone = "bg-garnet-600",
  className,
}: {
  filled: number;
  total: number;
  tone?: string;
  className?: string;
}) {
  const segments = Math.max(1, Math.min(total, 24));
  const filledCount = total > 0 ? Math.round((filled / total) * segments) : 0;
  return (
    <div className={cn("flex gap-1", className)} role="progressbar" aria-valuenow={filled} aria-valuemax={total}>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 flex-1 rounded-sm",
            i < filledCount ? tone : "bg-line"
          )}
        />
      ))}
    </div>
  );
}

/** Continuous thin bar for percentages. */
export function Bar({
  percent,
  tone = "bg-garnet-600",
  className,
}: {
  percent: number;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div
        className={cn("h-full rounded-full", tone)}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
