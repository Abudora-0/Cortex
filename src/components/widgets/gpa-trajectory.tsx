"use client";

import { useState } from "react";

export interface TrajectoryPoint {
  label: string; // "Fall 2025"
  short: string; // "F25"
  gpa: number;
}

const W = 340;
const H = 150;
const PAD = { l: 10, r: 10, t: 18, b: 26 };

/** Animated GPA-per-semester area chart with hover read-out. */
export function GpaTrajectory({ points }: { points: TrajectoryPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="grid h-[150px] place-items-center text-xs text-ink-faint">
        No graded semesters yet.
      </div>
    );
  }

  const gpas = points.map((p) => p.gpa);
  const yMax = 4;
  const yMin = Math.max(0, Math.min(...gpas) - 0.4);
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const x = (i: number) =>
    PAD.l + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (g: number) => PAD.t + (1 - (g - yMin) / (yMax - yMin)) * plotH;

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(p.gpa).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1).toFixed(1)} ${(PAD.t + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(PAD.t + plotH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="GPA per semester">
      <defs>
        <linearGradient id="traj-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-garnet-500)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-garnet-500)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* gridlines at whole grade points */}
      {[2, 3, 4].map((g) =>
        g >= yMin ? (
          <g key={g}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={y(g)}
              y2={y(g)}
              stroke="var(--color-line)"
              strokeDasharray="2 4"
            />
            <text x={W - PAD.r} y={y(g) - 3} textAnchor="end" style={{ font: "600 8px var(--font-instrument)", fill: "var(--color-ink-faint)" }}>
              {g.toFixed(1)}
            </text>
          </g>
        ) : null
      )}

      {/* area + line */}
      <path d={areaPath} fill="url(#traj-fill)" opacity={0.9} />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-garnet-600)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw"
        style={{ ["--len" as string]: "1" }}
      />

      {/* points + labels + hit targets */}
      {points.map((p, i) => {
        const active = hover === i;
        return (
          <g key={p.label}>
            <circle
              cx={x(i)}
              cy={y(p.gpa)}
              r={active ? 5.5 : 4}
              fill="var(--color-paper)"
              stroke="var(--color-garnet-600)"
              strokeWidth={2.5}
              className="point-pop"
              style={{ ["--d" as string]: `${0.5 + i * 0.12}s`, transition: "r 0.15s" }}
            />
            <text
              x={x(i)}
              y={H - 9}
              textAnchor="middle"
              style={{ font: "600 8.5px var(--font-instrument)", fill: active ? "var(--color-garnet-700)" : "var(--color-ink-faint)" }}
            >
              {p.short}
            </text>
            {active ? (
              <text
                x={x(i)}
                y={y(p.gpa) - 11}
                textAnchor="middle"
                style={{ font: "700 11px var(--font-jetbrains)", fill: "var(--color-ink)" }}
              >
                {p.gpa.toFixed(2)}
              </text>
            ) : null}
            <circle
              cx={x(i)}
              cy={y(p.gpa)}
              r={14}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
