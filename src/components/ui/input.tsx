import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft",
        className
      )}
      {...props}
    />
  );
}

const fieldBase =
  "w-full rounded-lg border border-line-strong bg-paper text-sm text-ink placeholder:text-ink-faint transition-all duration-200 hover:border-ink/40 focus:border-garnet-500 focus:outline-none focus:ring-[3px] focus:ring-[rgb(var(--accent-tint)/0.16)]";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-10 px-3", className)} {...props} />;
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldBase, "select-chevron h-10 cursor-pointer px-3", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "px-3 py-2", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
