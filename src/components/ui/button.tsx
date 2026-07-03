import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-garnet-600 text-white border border-garnet-700/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(28,25,23,0.16)] hover:bg-garnet-700 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_14px_-4px_rgba(var(--accent-tint),0.55)]",
  secondary:
    "bg-paper text-ink border border-line-strong hover:border-ink hover:bg-canvas shadow-lift",
  ghost:
    "bg-transparent text-ink-soft border border-transparent hover:bg-ink/[0.05] hover:text-ink",
  danger:
    "bg-paper text-fail border border-fail/35 hover:bg-fail-soft hover:border-fail/60",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  icon: "size-9 justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "ring-accent inline-flex select-none items-center justify-center rounded-lg font-medium transition-all duration-200 ease-[var(--ease-out-soft)] active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
