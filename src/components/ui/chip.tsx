import { cn } from "@/lib/utils";

type Tone = "neutral" | "garnet" | "pass" | "warn" | "fail" | "brass";

const tones: Record<Tone, string> = {
  neutral: "bg-canvas text-ink-soft border-line-strong",
  garnet: "bg-garnet-50 text-garnet-700 border-garnet-200",
  pass: "bg-pass-soft text-pass border-pass/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  fail: "bg-fail-soft text-fail border-fail/25",
  brass: "bg-brass-100 text-brass-700 border-brass-300",
};

export function Chip({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
