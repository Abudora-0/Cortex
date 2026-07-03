import { cn } from "@/lib/utils";

/**
 * UniHub logomark — an open book with a bookmark ribbon. Single-colour
 * (currentColor) with opacity for depth so it also works as a favicon.
 */
export function LogoMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      {/* left leaf */}
      <path
        d="M16 8.8C13.2 6.9 8.8 6.2 4.8 6.9C4.3 7 4 7.4 4 7.9V23.4C4 24 4.5 24.4 5.1 24.3C8.8 23.7 12.9 24.4 16 26.2Z"
        fill="currentColor"
        opacity="0.95"
      />
      {/* right leaf (slightly lighter) */}
      <path
        d="M16 8.8C18.8 6.9 23.2 6.2 27.2 6.9C27.7 7 28 7.4 28 7.9V23.4C28 24 27.5 24.4 26.9 24.3C23.2 23.7 19.1 24.4 16 26.2Z"
        fill="currentColor"
        opacity="0.68"
      />
      {/* page lines */}
      <g stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.1" strokeLinecap="round">
        <path d="M7.5 11.2C9.7 11 12 11.4 13.6 12" />
        <path d="M7.5 14.6C9.7 14.4 12 14.8 13.6 15.4" />
      </g>
      {/* bookmark ribbon */}
      <path
        d="M20.4 6.8L23.4 6.5V13L21.9 11.4L20.4 12.6Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

/** Tile + wordmark lockup. */
export function Logo({
  showWord = true,
  className,
}: {
  showWord?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-garnet-600 text-white shadow-[0_2px_8px_-2px_rgba(var(--accent-tint),0.5)]">
        <LogoMark size={19} />
      </span>
      {showWord ? (
        <span className="font-display text-lg font-bold tracking-tight">UniHub</span>
      ) : null}
    </span>
  );
}
