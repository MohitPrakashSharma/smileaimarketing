interface SparklineProps {
  values: number[];
  /** CSS colour for the stroke; the area under it is a flat tint of the same colour. */
  color: string;
  className?: string;
}

/** Tiny area chart for KPI cards. Purely decorative — the number beside it carries the data. */
export function Sparkline({ values, color, className = "h-10 w-24" }: SparklineProps) {
  const w = 96;
  const h = 40;
  const pad = 3;
  const max = Math.max(...values, 1);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)] as const);
  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${h} L${points[0][0].toFixed(1)},${h} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden preserveAspectRatio="none">
      <path d={area} fill={color} fillOpacity="0.1" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}
