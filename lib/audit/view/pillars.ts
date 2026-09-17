/** Pillar labels and "not measured" explanations shared by the web report and the PDF. */

export type PillarKey = "technical" | "content" | "performance" | "search" | "local";

/**
 * `attempted: false` marks areas this audit version does not measure at all
 * (search rankings, Google Business Profile). Customer-facing surfaces hide
 * them — a "not measured" card for a feature that was never run is not a
 * disclosure, it is a placeholder. Performance stays visible when unmeasured
 * because the audit did try (PageSpeed failure is a real disclosure).
 */
export const PILLAR_DEFS: Array<{ key: PillarKey; pillar: string; label: string; attempted: boolean; notMeasured: (city: string) => string }> = [
  { key: "technical", pillar: "TECHNICAL", label: "Technical SEO", attempted: true, notMeasured: () => "Not measured." },
  { key: "content", pillar: "CONTENT", label: "On-page & content", attempted: true, notMeasured: () => "Not measured." },
  { key: "performance", pillar: "PERFORMANCE", label: "Performance", attempted: true, notMeasured: () => "Google PageSpeed could not test the site during this audit." },
  { key: "search", pillar: "SEARCH", label: "Search visibility", attempted: false, notMeasured: () => "Ranking and keyword data are not part of this audit version." },
  { key: "local", pillar: "LOCAL", label: "Local SEO", attempted: false, notMeasured: (city) => (city ? "Google Business Profile and map-pack data are not part of this audit version." : "No physical location detected — not applicable.") },
];

/** The areas a customer report shows: everything the audit actually measures or attempts. */
export const CUSTOMER_PILLARS = PILLAR_DEFS.filter((p) => p.attempted);

export const PILLAR_LABEL: Record<string, string> = Object.fromEntries(PILLAR_DEFS.map((p) => [p.pillar, p.label]));
export const BUCKET_LABEL: Record<string, string> = { this_week: "Do this week", this_month: "Do this month", this_quarter: "Plan this quarter" };
export const OWNER_LABEL: Record<string, string> = { owner: "you can do this", developer: "needs a developer", agency: "we can handle this" };
export const IMPACT_LABEL = ["", "Minor", "Low", "Moderate", "High", "Very high"];
