// Hand-rolled SVG semi-circle gauge (no chart library) — the signature
// dashboard visual. Draws a track arc and a value arc from 0 to `value/max`.

const CX = 100;
const CY = 95;
const R = 72;
const STROKE = 18;

function polar(angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return { x: CX + R * Math.cos(rad), y: CY - R * Math.sin(rad) };
}

/** Arc path from startAngle to endAngle (degrees, 180 = left, 0 = right). */
function arc(startAngle: number, endAngle: number) {
  const s = polar(startAngle);
  const e = polar(endAngle);
  const largeArc = startAngle - endAngle > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export function Gauge({
  value,
  max,
  label,
  display,
  tone = "var(--color-garnet-600)",
}: {
  value: number;
  max: number;
  label: string;
  /** Big center figure; defaults to `value` */
  display?: string;
  tone?: string;
}) {
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const end = 180 - frac * 180;

  return (
    <svg viewBox="0 0 200 110" role="img" aria-label={`${label}: ${value} of ${max}`}>
      <path
        d={arc(180, 0)}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
      {frac > 0 ? (
        <path
          d={arc(180, end)}
          fill="none"
          stroke={tone}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
      ) : null}
      <text
        x={CX}
        y={CY - 18}
        textAnchor="middle"
        className="stat-figure"
        style={{ font: "700 30px var(--font-jetbrains, monospace)", fill: "var(--color-ink)" }}
      >
        {display ?? String(value)}
      </text>
      <text
        x={CX}
        y={CY + 2}
        textAnchor="middle"
        style={{
          font: "600 9px var(--font-instrument, sans-serif)",
          fill: "var(--color-ink-faint)",
          letterSpacing: "0.12em",
          textTransform: "uppercase" as const,
        }}
      >
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
