import ScoreGauge, { gaugeStatus } from "@/components/ui/ScoreGauge";
import { IconMapPin } from "@/components/icons";
import type { LocalComparison, ComparisonEntry, ComparisonMetricKey } from "@/lib/audit/competitors/types";
import { METRIC_LABEL } from "@/lib/audit/competitors/view";

/**
 * Section D — your local competitors. The audited practice beside the
 * verified nearby practices on one Google PageSpeed test (homepage, mobile).
 *
 * Only measurements actually stored for the same device and page type are
 * shown: a competitor that could not be tested says so, a competitor that has
 * not been tested yet says "Analysis in progress", and nothing is estimated.
 * The table lists the nearby practices that measured ahead of this practice on
 * at least one of the five measures — the ones that show where the ground is
 * being lost — plus any still being analysed. The count line says how many of
 * the measured practices that is, so the selection is stated rather than
 * implied; when none are ahead, every measured practice is listed under the
 * neutral heading instead.
 * The "measurable advantages" headline appears only when the comparison
 * itself produced competitor-ahead gaps. Nothing here claims rankings,
 * patients, revenue or market share, and none of it touches the audit score.
 */

const COLUMNS: ComparisonMetricKey[] = ["performanceScore", "lcpMs", "accessibility", "bestPractices", "seo"];
const SHORT_LABEL: Record<ComparisonMetricKey, string> = {
  performanceScore: "Performance",
  lcpMs: "Main content",
  accessibility: "Accessibility",
  bestPractices: "Best practices",
  seo: "Google SEO",
};
const fmt = (key: ComparisonMetricKey, v: number | null) => (v === null ? "—" : key === "lcpMs" ? `${(v / 1000).toFixed(1)}s` : String(v));

/** Pending (never measured) vs a genuine measurement failure — never conflated. */
function entryState(entry: ComparisonEntry): "ok" | "pending" | "failed" {
  const m = entry.measurement;
  if (m?.status === "ok") return "ok";
  if (!m && !entry.measuredAt) return "pending";
  return "failed";
}

/** True when `v` beats the practice's value on this metric (lower is better for LCP). */
function leads(key: ComparisonMetricKey, v: number | null, practice: number | null | undefined): boolean {
  if (v === null || practice === null || practice === undefined) return false;
  return key === "lcpMs" ? v < practice : v > practice;
}

function Row({ entry, isPractice, best, practiceM, hideBehind }: { entry: ComparisonEntry; isPractice: boolean; best: Partial<Record<ComparisonMetricKey, number>>; practiceM: ComparisonEntry["measurement"]; hideBehind: boolean }) {
  const state = entryState(entry);
  const m = entry.measurement;
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)] gap-3 px-4 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-6 sm:px-5 ${isPractice ? "bg-accent-soft/40" : ""}`}>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{isPractice ? "Your practice" : "Nearby practice"}</p>
        <p className={`mt-0.5 text-body font-bold [overflow-wrap:anywhere] ${isPractice ? "text-primary-ink" : "text-foreground"}`}>{entry.name}</p>
        {entry.website ? (
          <a href={entry.website} target="_blank" rel="noopener nofollow" className="break-all text-[12px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {entry.domain ?? entry.website}
          </a>
        ) : (
          entry.domain && <span className="break-all text-[12px] text-muted-foreground">{entry.domain}</span>
        )}
        {entry.relevance && !isPractice && <p className="text-[11px] text-muted-foreground">{entry.relevance}</p>}
      </div>

      {state === "ok" ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          {COLUMNS.map((key) => {
            const v = m![key];
            const isBest = v !== null && best[key] === v;
            // On a competitor row, only the measures where they lead are filled in; the rest read
            // as a dash, explained under the table (nothing is restated as better than it was).
            const behind = !isPractice && hideBehind && !leads(key, v, practiceM?.status === "ok" ? practiceM[key] : null);
            if (behind) {
              return (
                <div key={key} className="min-w-0">
                  <dd className="font-display text-[1.375rem] font-bold leading-none text-border-strong">—</dd>
                  <dt className="mt-1 text-[11px] leading-tight text-muted-foreground sm:hidden">{SHORT_LABEL[key]}</dt>
                </div>
              );
            }
            // Performance keeps Google's ring — the same dial PageSpeed Insights shows.
            if (key === "performanceScore") {
              return (
                <div key={key} className="min-w-0">
                  <ScoreGauge score={v} size={58} strokeWidth={6} status={v === null ? undefined : gaugeStatus(v)} showLabel={false} label={`${entry.name}: Google performance score on mobile`} />
                  <dt className="mt-1 text-[11px] leading-tight text-muted-foreground sm:hidden">{SHORT_LABEL[key]}</dt>
                </div>
              );
            }
            return (
              <div key={key} className="min-w-0">
                <dd className={`font-display text-[1.375rem] font-bold leading-none tracking-[-0.02em] ${v === null ? "text-muted-foreground" : isBest ? "text-[var(--color-status-healthy-fg)]" : "text-foreground"}`}>{fmt(key, v)}</dd>
                <dt className="mt-1 text-[11px] leading-tight text-muted-foreground sm:hidden">{SHORT_LABEL[key]}</dt>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="text-body-small text-muted-foreground">
          {state === "pending" ? "Analysis in progress — this homepage has not been tested yet." : "Google could not measure this homepage during the audit, so no numbers are shown."}
        </p>
      )}
    </div>
  );
}

export default function LocalComparisonSection({ comparison, publicToken }: { comparison: LocalComparison; publicToken: string }) {
  void publicToken; // the single closing CTA owns the conversion
  const advantages = comparison.gaps.filter((g) => g.direction === "competitor_better");
  const measuredCompetitors = comparison.competitors.filter((c) => entryState(c) === "ok");
  const ahead = new Set(advantages.map((g) => g.competitor));
  // Show the practices that measured ahead on at least one of the five measures; if none did,
  // show every measured practice (the heading then makes no advantage claim).
  const pending = comparison.competitors.filter((c) => entryState(c) === "pending");
  const shown = ahead.size > 0 ? comparison.competitors.filter((c) => ahead.has(c.name) || entryState(c) === "pending") : comparison.competitors;
  const shownNames = new Set(shown.map((c) => c.name));
  const strengths = comparison.gaps.filter((g) => g.direction === "practice_better" && shownNames.has(g.competitor));
  const entries = [comparison.practice, ...shown];
  const measured = measuredCompetitors.length;

  // Best measured value per column, so the strongest number in each is marked — measurement only.
  const best: Partial<Record<ComparisonMetricKey, number>> = {};
  for (const key of COLUMNS) {
    const vals = entries.map((e) => (e.measurement?.status === "ok" ? e.measurement[key] : null)).filter((v): v is number => v !== null);
    if (vals.length) best[key] = key === "lcpMs" ? Math.min(...vals) : Math.max(...vals);
  }

  // The headline only claims an advantage when the verified comparison produced one.
  const heading = advantages.length > 0 ? "Nearby practices have measurable website advantages" : "How your website compares nearby";

  return (
    <section id="local-comparison" aria-labelledby="local-comparison-heading" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary-ink"><IconMapPin className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-eyebrow text-muted-foreground">Your local competitors</p>
            <h2 id="local-comparison-heading" className="mt-2 font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-foreground sm:text-[2rem]">{heading}</h2>
            <p className="mt-3 text-body-small text-muted-foreground">
              {ahead.size > 0
                ? `${ahead.size} of the ${measured} nearby ${measured === 1 ? "practice" : "practices"} we measured scored ahead of your homepage on at least one of the five measures — those are the ones below.${pending.length ? ` ${pending.length} more ${pending.length === 1 ? "is" : "are"} still being analysed.` : ""}`
                : `${measured} of ${comparison.competitors.length} nearby ${comparison.competitors.length === 1 ? "practice" : "practices"} could be measured.`}{" "}
              Same Google PageSpeed test: mobile, homepage, the test used on your site. Website measurements only: not rankings, patient numbers or how well a practice is doing.
            </p>
          </div>
        </div>
      </div>

      {/* Side-by-side measurements */}
      <div className="hidden grid-cols-[minmax(0,14rem)_minmax(0,1fr)] gap-6 border-b border-border-subtle px-5 py-2 sm:grid">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Practice</span>
        <div className="grid grid-cols-5 gap-x-4">
          {COLUMNS.map((key) => (
            <span key={key} className="text-[11px] font-bold uppercase leading-tight tracking-wider text-muted-foreground">{SHORT_LABEL[key]}</span>
          ))}
        </div>
      </div>
      <div className="divide-y divide-border-subtle">
        {entries.map((e, i) => (
          <Row key={`${e.name}-${i}`} entry={e} isPractice={i === 0} best={best} practiceM={comparison.practice.measurement} hideBehind={ahead.size > 0} />
        ))}
      </div>

      {/* Evidence call-outs */}
      <div className="border-t border-border p-6 sm:p-8">
        {ahead.size > 0 && <p className="mb-5 text-metadata text-muted-foreground">A dash means that practice did not measure ahead of your homepage on that measure, so no number is shown for it.</p>}
        {advantages.length > 0 && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Where nearby practices measured better</p>
            <ul className="mt-2 space-y-2">
              {advantages.map((g) => (
                <li key={`${g.competitor}-${g.metric}`} className="flex items-start gap-2.5 text-body text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />
                  <span><span className="font-semibold">{METRIC_LABEL[g.metric]}:</span> {g.sentence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {strengths.length > 0 && (
          <div className={advantages.length > 0 ? "mt-5" : ""}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Where your practice measured better</p>
            <ul className="mt-2 space-y-2">
              {strengths.map((g) => (
                <li key={`${g.competitor}-${g.metric}`} className="flex items-start gap-2.5 text-body-small text-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-status-healthy-fg)]" aria-hidden="true" />
                  <span>{g.sentence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {comparison.gaps.length === 0 && <p className="text-body-small text-muted-foreground">No difference large enough to call out on the measurements available.</p>}
        {comparison.narrative && (
          <p className="mt-5 text-body-small text-foreground">
            {comparison.narrative.text} <span className="text-[11px] text-muted-foreground">(Written from the measurements above; every number is from the data.)</span>
          </p>
        )}

        <details className="mt-5 text-[12px] text-muted-foreground">
          <summary className="cursor-pointer font-semibold">How this comparison was made</summary>
          <p className="mt-2">{comparison.method}</p>
        </details>
        <p className="mt-2 text-[11px] text-muted-foreground">{comparison.attribution}</p>
      </div>
    </section>
  );
}
