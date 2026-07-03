"use client";

import { CountUp } from "./count-up";

const CX = 100;
const CY = 96;
const R = 74;
const STROKE = 16;

function polar(angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
}
function arc(startAngle: number, endAngle: number) {
  const s = polar(startAngle);
  const e = polar(endAngle);
  const large = startAngle - endAngle > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

/** Semi-circle gauge whose value arc draws in, with a counting centre figure. */
export function AnimatedGauge({
  value,
  max,
  decimals = 2,
  caption,
  badge,
}: {
  value: number;
  max: number;
  decimals?: number;
  caption?: string;
  badge?: React.ReactNode;
}) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const end = 180 - frac * 180;

  return (
    <div className="relative">
      <svg viewBox="0 0 200 112" className="w-full">
        <path d={arc(180, 0)} fill="none" stroke="var(--color-line)" strokeWidth={STROKE} strokeLinecap="round" />
        {frac > 0 ? (
          <path
            d={arc(180, end)}
            fill="none"
            stroke="var(--color-garnet-600)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            pathLength={1}
            className="draw"
            style={{ ["--len" as string]: "1" }}
          />
        ) : null}
      </svg>
      <div className="absolute inset-x-0 bottom-1 flex flex-col items-center">
        <span className="stat-figure text-4xl font-bold text-ink">
          <CountUp value={value} decimals={decimals} />
        </span>
        {caption ? (
          <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
            {caption}
          </span>
        ) : null}
      </div>
      {badge ? <div className="absolute right-2 top-1">{badge}</div> : null}
    </div>
  );
}
