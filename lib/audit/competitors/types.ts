/**
 * Local competitor comparison (Phase 4). Everything here is either a business
 * fact returned by the discovery provider or a measurement we took ourselves
 * with the same PageSpeed provider the audit uses. Nothing is estimated: a
 * metric that could not be measured is `null` and rendered as unavailable.
 *
 * Kept entirely outside the scoring pipeline — no competitor value ever
 * touches a pillar or the overall score.
 */

export type CompetitorSource = "GOOGLE_PLACES";

/** One candidate returned by the discovery provider (before selection). */
export interface DiscoveredPlace {
  placeId: string;
  name: string;
  website: string | null;
  address: string | null;
  city: string | null;
  types: string[];
  businessStatus: string | null;
  /** Straight-line distance from the audited practice, when both locations were known. */
  distanceKm: number | null;
}

/** Our own homepage measurement of one site (mobile, same categories the audit requests). */
export interface CompetitorMeasurement {
  strategy: "mobile";
  url: string;
  status: "ok" | "unavailable";
  error: string | null;
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  accessibility: number | null;
  bestPractices: number | null;
  seo: number | null;
  lighthouseVersion: string | null;
  analysisUtc: string | null;
}

export type ComparisonMetricKey = "performanceScore" | "lcpMs" | "accessibility" | "bestPractices" | "seo";

/** One measured, evidence-backed difference between a competitor and the audited practice. */
export interface ComparisonGap {
  competitor: string;
  metric: ComparisonMetricKey;
  /** Positive when the competitor measured better. */
  direction: "competitor_better" | "practice_better";
  practiceValue: number;
  competitorValue: number;
  sentence: string;
}

export interface ComparisonEntry {
  /** From the practice's own website (schema.org / og:site_name / title) — never Places content. */
  name: string;
  website: string | null;
  domain: string | null;
  /** Why it was chosen and roughly how far away, derived at discovery ("pediatric dentist · about 2 km from your practice"). */
  relevance: string | null;
  measurement: CompetitorMeasurement | null;
  measuredAt: string | null;
}

/** What the web report and the customer PDF render. `null` from the builder means "no comparison — omit the section". */
export interface LocalComparison {
  heading: "How Does Your Practice Compare Locally?" | "Where Nearby Practices Have an Advantage";
  practice: ComparisonEntry;
  competitors: ComparisonEntry[];
  gaps: ComparisonGap[];
  source: CompetitorSource;
  discoveredAt: string;
  /** Methodology in one paragraph — same test, same device, comparable page, dates. */
  method: string;
  /** Provider attribution line shown wherever the data appears (Places policy). */
  attribution: string;
  /** Optional model-written explanation, validated against the data (see narrative.ts); null when unavailable. */
  narrative: { text: string; model: string; generatedAt: string } | null;
}
