import type { BriefingProblem } from "@/lib/audit/view/briefing";

/**
 * One verified problem, told as a story page: a masthead strip, the measured
 * fact as a kicker, an editorial headline, the measurement in a filled chip,
 * then "what's happening" beside "how to fix it" and the target the fix is
 * measured against. Every line comes from the shared briefing builder, so the
 * PDF prints exactly the same words.
 */

const CHIP_FILL: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-danger text-white",
  MEDIUM: "bg-[var(--color-status-opportunity-fg)] text-white",
  LOW: "bg-primary text-white",
  OPPORTUNITY: "bg-primary text-white",
};

export default function StoryCard({ problem, index, total }: { problem: BriefingProblem; index: number; total: number }) {
  const p = problem;
  // The headline, split so the highlighted phrase can carry its own background.
  const cut = p.storyHighlight && p.storyHeadline.includes(p.storyHighlight) ? p.storyHeadline.indexOf(p.storyHighlight) : -1;
  const head = cut >= 0 ? { before: p.storyHeadline.slice(0, cut), mark: p.storyHighlight, after: p.storyHeadline.slice(cut + p.storyHighlight.length) } : { before: p.storyHeadline, mark: "", after: "" };

  return (
    <article id={`story-${index + 1}`} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-4 bg-background-dark px-5 py-2.5 sm:px-8">
        <span className="text-[11px] font-bold uppercase tracking-wider text-white">Problem {index + 1} of {total}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-accent-on-dark">{p.area}</span>
      </div>

      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-foreground pb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-ink">Story {String(index + 1).padStart(2, "0")}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-foreground [overflow-wrap:anywhere]">{p.tag}</span>
        </div>

        <h3 className="mt-5 font-display text-[1.75rem] font-extrabold leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
          {head.before}
          {head.mark && <span className="bg-accent-soft box-decoration-clone px-1">{head.mark}</span>}
          {head.after}
        </h3>
        <p className="mt-3 font-copy text-body-large italic text-foreground">{p.implication}</p>

        {/* The measurement, in the reader's face */}
        <div className="mt-6 flex flex-col overflow-hidden rounded-[var(--radius-medium)] border border-foreground sm:flex-row">
          {p.chip && (
            <div className={`flex shrink-0 items-center justify-center px-6 py-4 sm:w-40 ${CHIP_FILL[p.severity] ?? CHIP_FILL.LOW}`}>
              <span className="font-display text-[1.75rem] font-bold leading-none tracking-[-0.02em]">{p.chip}</span>
            </div>
          )}
          <div className="min-w-0 px-5 py-4">
            <p className="text-body font-bold text-foreground">{p.severityLabel} · {p.headline}</p>
            <p className="mt-1 font-copy text-body-small italic text-muted-foreground">{p.chipNote}</p>
          </div>
        </div>

        <div className="mt-7 grid gap-x-10 gap-y-7 sm:grid-cols-2">
          <div>
            <p className="border-b-2 border-foreground pb-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">What&apos;s happening</p>
            <div className="mt-3 space-y-3">
              {p.happening.map((para) => (
                <p key={para} className="text-body-small text-foreground">{para}</p>
              ))}
            </div>
          </div>
          <div>
            <p className="border-b-2 border-foreground pb-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground">How to fix it</p>
            <ol className="mt-3 space-y-4">
              {p.fixes.map((fix, i) => (
                <li key={fix.title} className="flex items-start gap-3">
                  <span className="font-display text-[1.125rem] font-bold leading-none text-primary">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="block text-body-small font-bold text-foreground">{fix.title}</span>
                    <span className="mt-0.5 block text-body-small text-muted-foreground">{fix.detail}</span>
                  </span>
                </li>
              ))}
              {p.fixes.length === 0 && <li className="text-body-small text-foreground">{p.action}</li>}
            </ol>
          </div>
        </div>
      </div>

      <div className="border-t-2 border-primary bg-accent-soft px-5 py-4 sm:px-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary-ink">What you&apos;ll get</p>
        <p className="mt-1 text-body font-bold text-foreground">{p.action} {p.target}</p>
      </div>
    </article>
  );
}
