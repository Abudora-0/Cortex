import { cn } from "@/lib/utils";

export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line bg-canvas text-left text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
        {children}
      </tr>
    </thead>
  );
}

export function Th({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("px-5 py-2.5 font-semibold", className)} {...props} />;
}

export function Tr({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-line/70 last:border-0 hover:bg-canvas/60",
        className
      )}
      {...props}
    />
  );
}

export function Td({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-3 align-middle", className)} {...props} />;
}

/** Row-number cell, like the reference design's numbered lists. */
export function RowNum({ n }: { n: number }) {
  return (
    <Td className="w-10 pr-0 font-mono text-xs font-bold text-ink-faint">{n}</Td>
  );
}
