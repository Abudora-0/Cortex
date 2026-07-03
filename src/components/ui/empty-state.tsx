import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  hint,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong bg-canvas/50 px-6 py-10 text-center",
        className
      )}
    >
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
      {hint ? <p className="max-w-xs text-xs text-ink-faint">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
