/**
 * CN Tower, drawn as a flat vector.
 *
 * Ours, not a traced logo or a stock asset — a building's outline carries no
 * licence. Decorative: the heading carries the meaning, so it is hidden from
 * assistive tech.
 *
 * Proportions follow the real tower: the SkyPod is roughly four times the
 * shaft, not ten, and the mast is about a fifth of the total height.
 * Fitted, not cropped: the real tower is a narrow silhouette, and slicing it
 * to fill a wide box just zooms into the mast until it reads as a needle with
 * a saucer on it. The whole profile is shown, anchored to the base.
 */
export default function CnTowerVector({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 900"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      fill="none"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="cn-tower-fill" x1="160" y1="0" x2="160" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-teal-soft)" />
          <stop offset="40%" stopColor="var(--color-blue-50)" />
          <stop offset="100%" stopColor="var(--color-blue-200)" />
        </linearGradient>
      </defs>

      <g fill="url(#cn-tower-fill)">
        {/* Antenna mast, tapering to the tip */}
        <path d="M156.8 188 L158.8 34 C159.4 26 160.6 26 161.2 34 L163.2 188 Z" />

        {/* Sky Pod — the small upper deck */}
        <path d="M133 186 h54 l3 18 c0 5 -4 9 -9 9 h-42 c-5 0 -9 -4 -9 -9 Z" />

        {/* Shaft between the decks */}
        <path d="M145 213 h30 l4.5 79 h-39 Z" />

        {/* SkyPod — the main observation deck */}
        <path d="M86 294 c0 -7 33 -12 74 -12 c41 0 74 5 74 12 l0 22 c0 6 -18 11 -44 13 l-12 29 c-1 3 -4 5 -7 5 h-22 c-3 0 -6 -2 -7 -5 l-12 -29 c-26 -2 -44 -7 -44 -13 Z" />

        {/* Main shaft, widening toward the ground */}
        <path d="M139 360 h42 l30 540 h-102 Z" />
      </g>
    </svg>
  );
}
