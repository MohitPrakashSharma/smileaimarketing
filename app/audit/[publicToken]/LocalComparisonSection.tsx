import ScoreGauge, { gaugeStatus } from "@/components/ui/ScoreGauge";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { IconMapPin } from "@/components/icons";
import type { LocalComparison, ComparisonEntry, ComparisonMetricKey } from "@/lib/audit/competitors/types";
import { METRIC_LABEL } from "@/lib/audit/competitors/view";
import { consultationUrl } from "@/lib/audit/technicalReport";

/**
 * "How Does Your Practice Compare Locally?" — the audited practice beside
 * 2–3 verified nearby practices, on the same Google PageSpeed test (homepage,
 * mobile). Only ever rendered when `comparison` is non-null: the builder
 * returns null rather than a placeholder, and every metric it could not
 * measure is shown as unavailable. Nothing here feeds the audit score.
 */

const COLUMNS: ComparisonMetricKey[] = ["performanceScore", "lcpMs", "accessibility", "bestPractices", "seo"];
const fmt = (key: ComparisonMetricKey, v: number | null) => (v === null ? "—" : key === "lcpMs" ? `${(v / 1000).toFixed(1)} s` : `${v}`);

function EntryCard({ entry, isPractice }: { entry: ComparisonEntry; isPractice: boolean }) {
  const m = entry.measurement;
  const ok = m?.status === "ok";
  const score = ok ? m!.performanceScore : null;
  return (
    <div className={`flex flex-col rounded-[var(--radius-large)] border p-5 ${isPractice ? "border-primary bg-accent-soft/40" : "border-border bg-background"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{isPractice ? "Your practice" : "Nearby practice"}</p>
          <h3 className="mt-1 text-heading-4 text-foreground [overflow-wrap:anywhere]">{entry.name}</h3>
          {entry.domain && <p className="break-all text-[12px] leading-snug text-muted-foreground">{entry.domain}</p>}
          {entry.relevance && !isPractice && <p className="mt-0.5 text-[11px] text-muted-foreground">{entry.relevance}</p>}
        </div>
        <ScoreGauge score={score} size={64} strokeWidth={7} status={score === null ? undefined : gaugeStatus(score)} showLabel={false} label={`${entry.name}: Google performance score on mobile`} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-body-small">
        {COLUMNS.map((key) => (
          <div key={key} className="min-w-0">
            <dt className="text-[11px] text-muted-foreground">{METRIC_LABEL[key]}</dt>
            <dd className={`font-semibold ${ok && m![key] !== null ? "text-foreground" : "text-muted-foreground"}`}>{ok ? fmt(key, m![key]) : "Unavailable"}</dd>
          </div>
        ))}
      </dl>
      {!ok && <p className="mt-3 text-[11px] text-muted-foreground">Google could not measure this homepage during the audit — no number is shown instead.</p>}
    </div>
  );
}

export default function LocalComparisonSection({ comparison, publicToken }: { comparison: LocalComparison; publicToken: string }) {
  const advantages = comparison.gaps.filter((g) => g.direction === "competitor_better");
  const strengths = comparison.gaps.filter((g) => g.direction === "practice_better");
  return (
    <section id="local-comparison" aria-labelledby="local-comparison-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink"><IconMapPin className="h-5 w-5" /></span>
        <div>
          <h2 id="local-comparison-heading" className="text-heading-3 text-foreground">{comparison.heading}</h2>
          <p className="mt-1 text-body-small text-muted-foreground">See how your website compares with other dental practices serving your area — same Google test, same device, same page type.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <EntryCard entry={comparison.practice} isPractice />
        {comparison.competitors.map((c) => (
          <EntryCard key={c.name} entry={c} isPractice={false} />
        ))}
      </div>

      {(advantages.length > 0 || strengths.length > 0) && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {advantages.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Where nearby practices measured better</p>
              <ul className="mt-2 space-y-1.5">
                {advantages.map((g) => (
                  <li key={`${g.competitor}-${g.metric}`} className="flex items-start gap-2 text-body-small text-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" aria-hidden="true" />{g.sentence}</li>
                ))}
              </ul>
            </div>
          )}
          {strengths.length > 0 && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Where your practice measured better</p>
              <ul className="mt-2 space-y-1.5">
                {strengths.map((g) => (
                  <li key={`${g.competitor}-${g.metric}`} className="flex items-start gap-2 text-body-small text-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-status-healthy-fg)]" aria-hidden="true" />{g.sentence}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {comparison.gaps.length === 0 && <p className="mt-4 text-body-small text-muted-foreground">No difference large enough to call out on the metrics that could be measured.</p>}
      {comparison.narrative && (
        <p className="mt-4 text-body-small text-foreground">
          {comparison.narrative.text} <span className="text-[11px] text-muted-foreground">(Explanation written from the measurements above; every number is from the data.)</span>
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4 rounded-[var(--radius-medium)] border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-small text-muted-foreground">Want to know what it would take to match or pass these practices on the measurements that matter? We will go through the gaps with you.</p>
        <a href={consultationUrl("", publicToken)} className={buttonClasses({ size: "sm", className: "shrink-0" })}>
          <span>See How Your Practice Can Close the Gap</span>
          <ButtonArrow />
        </a>
      </div>

      <details className="mt-4 text-[12px] text-muted-foreground">
        <summary className="cursor-pointer font-semibold">How this comparison was made</summary>
        <p className="mt-2">{comparison.method}</p>
      </details>
      <p className="mt-2 text-[11px] text-muted-foreground">{comparison.attribution}</p>
    </section>
  );
}
