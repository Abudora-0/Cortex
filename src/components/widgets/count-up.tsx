"use client";

import { useEffect, useState } from "react";

/** Eases a number from 0 to `value` on mount. Honours reduced-motion. */
export function CountUp({
  value,
  decimals = 0,
  duration = 950,
  className,
  suffix,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const [v, setV] = useState(0);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setV(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setV(value * (1 - Math.pow(1 - t, 3))); // easeOutCubic
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className}>
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}
