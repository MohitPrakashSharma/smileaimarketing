import type { Competitor } from "@prisma/client";
import type { PerfRow } from "../view/performanceView";
import { ownHomepageMeasurement } from "./measure";
import { normalizeDomain } from "./select";
import type { ComparisonEntry, ComparisonGap, ComparisonMetricKey, CompetitorMeasurement, LocalComparison, LocalComparisonStageRecord, LocalComparisonState } from "./types";

/**
 * Turns stored Competitor rows (source GOOGLE_PLACES) plus the audit's own
 * PageSpeed rows into what the report and PDF render. Pure and deterministic;
 * returns null when there is nothing verified to show, and never invents a
 * value — an unmeasured metric stays null and is labelled unavailable.
 */

export const METRIC_LABEL: Record<ComparisonMetricKey, string> = {
  performanceScore: "Google performance (mobile)",
  lcpMs: "Main content visible (LCP, mobile)",
  accessibility: "Accessibility",
  bestPractices: "Best Practices",
  seo: "Google SEO basics",
};

/** Differences below these are noise between two Lighthouse runs and are not called out. */
const MIN_GAP: Record<ComparisonMetricKey, number> = { performanceScore: 10, lcpMs: 1000, accessibility: 8, bestPractices: 8, seo: 8 };

const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export function competitorGaps(practice: CompetitorMeasurement | null, entries: ComparisonEntry[]): ComparisonGap[] {
  if (!practice || practice.status !== "ok") return [];
  const gaps: ComparisonGap[] = [];
  for (const e of entries) {
    const m = e.measurement;
    if (!m || m.status !== "ok") continue;
    for (const key of Object.keys(MIN_GAP) as ComparisonMetricKey[]) {
      const pv = practice[key];
      const cv = m[key];
      if (pv === null || cv === null) continue;
      const lowerIsBetter = key === "lcpMs";
      const diff = lowerIsBetter ? pv - cv : cv - pv; // positive → competitor better
      if (Math.abs(diff) < MIN_GAP[key]) continue;
      const direction = diff > 0 ? "competitor_better" : "practice_better";
      const sentence =
        key === "lcpMs"
          ? direction === "competitor_better"
            ? `${e.name}'s homepage shows its main content in ${sec(cv)} on mobile, against ${sec(pv)} for yours.`
            : `Your homepage shows its main content in ${sec(pv)} on mobile, against ${sec(cv)} for ${e.name}.`
          : direction === "competitor_better"
            ? `${e.name} scores ${cv}/100 on ${METRIC_LABEL[key]} against your ${pv}/100.`
            : `You score ${pv}/100 on ${METRIC_LABEL[key]} against ${cv}/100 for ${e.name}.`;
      gaps.push({ competitor: e.name, metric: key, direction, practiceValue: pv, competitorValue: cv, sentence });
    }
  }
  return gaps;
}

const toEntry = (c: Competitor): ComparisonEntry => ({
  name: c.name,
  website: c.website,
  domain: normalizeDomain(c.website),
  relevance: c.relevance,
  measurement: (c.measurementJson as CompetitorMeasurement | null) ?? null,
  measuredAt: c.measuredAt ? c.measuredAt.toISOString() : null,
});

export function buildLocalComparison(business: { name: string; website: string; city: string }, rows: Competitor[], perf: PerfRow[], narrative: LocalComparison["narrative"] = null): LocalComparison | null {
  const local = rows.filter((r) => r.source === "GOOGLE_PLACES" && r.website);
  if (local.length < 2) return null; // one competitor is an anecdote, not a comparison
  const competitors = local.sort((a, b) => a.rank - b.rank).map(toEntry);
  const own = ownHomepageMeasurement(perf);
  const practice: ComparisonEntry = { name: business.name, website: business.website, domain: normalizeDomain(business.website), relevance: null, measurement: own, measuredAt: own?.analysisUtc ?? null };
  const gaps = competitorGaps(own, competitors);
  const advantages = gaps.filter((g) => g.direction === "competitor_better");
  const heading = advantages.length >= 2 ? "Where Nearby Practices Have an Advantage" : "How Does Your Practice Compare Locally?";
  const discoveredAt = (local.map((r) => r.discoveredAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? local[0].createdAt).toISOString();
  const measuredCount = competitors.filter((c) => c.measurement?.status === "ok").length;
  const method = `Nearby dental practices serving ${business.city || "the same area"} were identified with Google Maps on ${new Date(discoveredAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}; each practice's name and website were then confirmed from its own website, and its homepage was tested with Google PageSpeed Insights on mobile — the same test, device and page type used for your homepage. ${measuredCount} of ${competitors.length} competitor homepages could be measured; anything Google could not measure is shown as unavailable, never estimated. These are website measurements only: they do not show search rankings, patient numbers or how well a practice is doing.`;
  return { heading, practice, competitors, gaps, source: "GOOGLE_PLACES", discoveredAt, method, attribution: "Nearby practices located with Google Maps · Website measurements by Google PageSpeed Insights", narrative };
}

/** A queued/running stage older than this is treated as not finishing (worker lost) rather than "still analysing" forever. */
export const COMPARISON_PENDING_TIMEOUT_MS = 12 * 60 * 1000;

const isRecord = (v: unknown): v is LocalComparisonStageRecord => !!v && typeof v === "object" && typeof (v as { status?: unknown }).status === "string" && typeof (v as { at?: unknown }).at === "string";

/** The stage record stored on the audit summary, if any (tolerates missing or malformed JSON). */
export function stageRecordFrom(summaryJson: unknown): LocalComparisonStageRecord | null {
  const rec = (summaryJson as { localComparison?: unknown } | null)?.localComparison;
  return isRecord(rec) ? rec : null;
}

const UNMEASURED_REASON = "Google PageSpeed could not measure any of the nearby homepages, so there is nothing to compare.";

/**
 * Where the comparison stands, from stored data only. Order of trust: the
 * stage record (written by the job itself), then the rows (for audits that
 * predate the record). "pending" always carries a start time so a stage that
 * never reports back turns into "unavailable" after COMPARISON_PENDING_TIMEOUT_MS.
 */
export function localComparisonState(rows: Competitor[], summaryJson: unknown, now: Date = new Date()): LocalComparisonState {
  const local = rows.filter((r) => r.source === "GOOGLE_PLACES" && r.website);
  const rec = stageRecordFrom(summaryJson);
  const measured = local.filter((r) => (r.measurementJson as CompetitorMeasurement | null)?.status === "ok").length;
  const settled = (): LocalComparisonState => {
    if (local.length < 2) return { state: "none", reason: "fewer than two verified nearby practices" };
    if (measured === 0) return { state: "unavailable", reason: UNMEASURED_REASON };
    return { state: "ready", measured, total: local.length };
  };
  if (rec) {
    if (rec.status === "queued" || rec.status === "running") {
      const since = new Date(rec.at);
      if (Number.isNaN(since.getTime()) || now.getTime() - since.getTime() > COMPARISON_PENDING_TIMEOUT_MS) return { state: "unavailable", reason: "The comparison of nearby practices did not finish, so no competitor measurements are shown." };
      return { state: "pending", since: rec.at };
    }
    if (rec.status === "failed") return { state: "unavailable", reason: "The comparison of nearby practices could not be completed, so no competitor measurements are shown." };
    if (rec.status === "skipped") return { state: "none", reason: rec.reason };
    return settled();
  }
  // No record (older audit, or the record write failed): rows still being measured within the
  // window count as in progress; after it, an unmeasured row is simply unavailable.
  const unmeasured = local.filter((r) => !r.measuredAt);
  if (local.length >= 2 && unmeasured.length) {
    const discovered = Math.max(...local.map((r) => (r.discoveredAt ?? r.createdAt).getTime()));
    if (now.getTime() - discovered <= COMPARISON_PENDING_TIMEOUT_MS) return { state: "pending", since: new Date(discovered).toISOString() };
  }
  return settled();
}

/** State + comparison together: the comparison exists only in the `ready` state, so nothing renders "unavailable" for a measurement that has not run yet. */
export function buildLocalComparisonView(business: { name: string; website: string; city: string }, rows: Competitor[], perf: PerfRow[], summaryJson: unknown, now: Date = new Date()): { state: LocalComparisonState; comparison: LocalComparison | null } {
  const state = localComparisonState(rows, summaryJson, now);
  if (state.state !== "ready") return { state, comparison: null };
  const narrative = ((summaryJson as { localComparisonNarrative?: LocalComparison["narrative"] } | null)?.localComparisonNarrative ?? null);
  return { state, comparison: buildLocalComparison(business, rows, perf, narrative) };
}

