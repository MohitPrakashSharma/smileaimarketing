import ScoreGauge, { gaugeStatus } from "@/components/ui/ScoreGauge";
import { buildPerformanceView, googleChecksFor, testDateLabel, type PerfRow } from "@/lib/audit/view/performanceView";

/**
 * Google's own PageSpeed Insights scores for the page a patient lands on
 * first — one ring per category, from the stored homepage × mobile run. Four
 * numbers and nothing else: the per-page dashboard, failed-audit lists and
 * raw API errors belong in the technical report. Returns null when Google
 * could not test the site, so no ring is ever drawn without a measurement.
 */
export default function GoogleScoresStrip({ rows }: { rows: PerfRow[] }) {
  const view = buildPerformanceView(rows);
  const page = view.pages.find((p) => p.pageType === "home") ?? view.pages[0];
  const row = page?.mobile ?? page?.desktop ?? null;
  if (!row || row.status !== "ok") return null;
  const scores = googleChecksFor(row).filter((c) => c.kind === "score" && c.available && c.score !== null);
  if (!scores.length) return null;
  const date = testDateLabel(row.analysisUtc);
  const device = page?.mobile ? "mobile" : "desktop";

  return (
    <section id="google-scores" aria-labelledby="google-scores-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="google-scores-heading" className="text-heading-3 text-foreground">Google&apos;s own scores for your homepage</h2>
        <p className="text-metadata text-muted-foreground">PageSpeed Insights · {device}{date ? ` · tested ${date}` : ""}</p>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-x-4 gap-y-6 sm:justify-start sm:gap-x-10">
        {scores.map((c) => (
          <ScoreGauge key={c.key} score={c.score} size={92} strokeWidth={8} status={gaugeStatus(c.score!)} caption={c.label} label={`Google ${c.label} score for your homepage`} />
        ))}
      </div>
      <p className="mt-4 text-metadata text-muted-foreground">
        Google&apos;s measurements of this one page on this one device — not the same thing as our audit score, which covers every page we crawled.
      </p>
    </section>
  );
}
