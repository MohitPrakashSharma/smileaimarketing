import type { StatusLevel } from "@/components/ui/StatusBadge";

/**
 * Circular SVG score gauge (0–100). The arc length is the real score — never
 * animated to a placeholder. `score: null` renders an honest empty ring with
 * an em dash, so a missing measurement can never look like a low one.
 */

const STATUS_STROKE: Record<StatusLevel, string> = {
  healthy: "var(--color-status-healthy-fg)",
  opportunity: "var(--color-status-opportunity-fg)",
  attention: "var(--color-status-attention-fg)",
};

/** Google's PageSpeed bands: 90–100 good, 50–89 needs improvement, 0–49 poor. */
export function gaugeStatus(score: number): StatusLevel {
  if (score >= 90) return "healthy";
  if (score >= 50) return "opportunity";
  return "attention";
}

export const GAUGE_LABEL: Record<StatusLevel, string> = { healthy: "Good", opportunity: "Needs work", attention: "Poor" };
const BADGE_CLASS: Record<StatusLevel, string> = { healthy: "badge-healthy", opportunity: "badge-opportunity", attention: "badge-attention" };

type ScoreGaugeProps = {
  score: number | null;
  /** Rendered diameter in px (the SVG scales with it). */
  size?: number;
  strokeWidth?: number;
  /** Short caption under the number, e.g. "Mobile". */
  caption?: string;
  /** Accessible description of what the number is, e.g. "Google PageSpeed score, mobile, homepage". */
  label: string;
  /** Override the status derived from the score (e.g. to use the pillar's own bands). */
  status?: StatusLevel;
  /** Hide the Good / Needs work / Poor chip (compact tiles carry their own label). */
  showLabel?: boolean;
  className?: string;
};

export default function ScoreGauge({ score, size = 160, strokeWidth = 12, caption, label, status, showLabel = true, className = "" }: ScoreGaugeProps) {
  const clamped = score === null ? null : Math.max(0, Math.min(100, Math.round(score)));
  const level = clamped === null ? null : (status ?? gaugeStatus(clamped));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const filled = clamped === null ? 0 : (clamped / 100) * c;
  const accessible = clamped === null ? `${label}: not measured` : `${label}: ${clamped} out of 100, ${GAUGE_LABEL[level!].toLowerCase()}`;

  return (
    <figure className={`inline-flex flex-col items-center ${className}`} style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={accessible}
        className="block"
      >
        <title>{accessible}</title>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-alt)" strokeWidth={strokeWidth} />
        {clamped !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={STATUS_STROKE[level!]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`}
            strokeDashoffset={c / 4}
            style={{ transition: "stroke-dasharray 600ms ease-out" }}
          />
        )}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-display)"
          fontWeight={700}
          fontSize={size * 0.3}
          fill={clamped === null ? "var(--color-text-faint)" : "var(--color-text)"}
          aria-hidden="true"
        >
          {clamped === null ? "—" : clamped}
        </text>
      </svg>
      {(showLabel || caption) && (
        <figcaption className="mt-2 text-center">
          {showLabel && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.75rem] font-semibold leading-none ${level ? BADGE_CLASS[level] : "border-border text-muted-foreground"}`}
            >
              {level && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
              {level ? GAUGE_LABEL[level] : "Not measured"}
            </span>
          )}
          {caption && <span className={`${showLabel ? "mt-1.5" : ""} block text-metadata text-muted-foreground`}>{caption}</span>}
        </figcaption>
      )}
    </figure>
  );
}
