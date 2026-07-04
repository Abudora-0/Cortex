import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-paper shadow-lift transition-all duration-300 ease-[var(--ease-out-soft)]",
        interactive &&
          "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raise",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  hint,
  action,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-line px-5 py-4",
        className
      )}
    >
      <div>
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-faint">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
