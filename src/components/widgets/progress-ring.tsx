"use client";

import { useEffect, useState } from "react";

/** Circular progress that sweeps to its value on mount. */
export function ProgressRing({
  value,
  max,
  size = 128,
  stroke = 11,
  children,
  tone = "var(--color-garnet-600)",
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  tone?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const [offset, setOffset] = useState(c);

  useEffect(() => {
    const target = c * (1 - frac);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOffset(target);
      return;
    }
    const id = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(id);
  }, [c, frac]);

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
