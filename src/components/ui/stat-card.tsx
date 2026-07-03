import { cn } from "@/lib/utils";
import { Card } from "./card";

export function StatCard({
  label,
  figure,
  suffix,
  hint,
  children,
  className,
}: {
  label: string;
  figure: string;
  suffix?: string;
  hint?: React.ReactNode;
  /** Optional footer viz (sparkline, progress, etc.) */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card interactive className={cn("flex flex-col justify-between px-5 py-4", className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
        {label}
      </p>
      <p className="stat-figure mt-2 text-4xl font-bold text-ink">
        {figure}
        {suffix ? (
          <span className="ml-1 text-base font-medium text-ink-faint">{suffix}</span>
        ) : null}
      </p>
      {hint ? <div className="mt-1 text-xs text-ink-soft">{hint}</div> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </Card>
  );
}
