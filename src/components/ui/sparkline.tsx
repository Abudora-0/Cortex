// Tiny inline SVG polyline for stat-card footers.

export function Sparkline({
  points,
  width = 120,
  height = 32,
  tone = "var(--color-garnet-500)",
}: {
  points: number[];
  width?: number;
  height?: number;
  tone?: string;
}) {
  if (points.length < 2) {
    return <div style={{ width, height }} />;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 3;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (p - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1].split(",");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke={tone}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill={tone} />
    </svg>
  );
}
