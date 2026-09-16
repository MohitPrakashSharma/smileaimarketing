/** Pillar labels and "not measured" explanations shared by the web report and the PDF. */

export type PillarKey = "technical" | "content" | "performance" | "search" | "local";

export const PILLAR_DEFS: Array<{ key: PillarKey; pillar: string; label: string; notMeasured: (city: string) => string }> = [
  { key: "technical", pillar: "TECHNICAL", label: "Technical SEO", notMeasured: () => "Not measured." },
  { key: "content", pillar: "CONTENT", label: "On-page & content", notMeasured: () => "Not measured." },
  { key: "performance", pillar: "PERFORMANCE", label: "Performance", notMeasured: () => "Google PageSpeed could not test the site during this audit." },
  { key: "search", pillar: "SEARCH", label: "Search visibility", notMeasured: () => "Ranking and keyword data are collected in a later phase." },
  { key: "local", pillar: "LOCAL", label: "Local SEO", notMeasured: (city) => (city ? "Google Business Profile and map-pack data are collected in a later phase." : "No physical location detected — not applicable.") },
];

export const PILLAR_LABEL: Record<string, string> = Object.fromEntries(PILLAR_DEFS.map((p) => [p.pillar, p.label]));
export const BUCKET_LABEL: Record<string, string> = { this_week: "Do this week", this_month: "Do this month", this_quarter: "Plan this quarter" };
export const OWNER_LABEL: Record<string, string> = { owner: "you can do this", developer: "needs a developer", agency: "we can handle this" };
export const IMPACT_LABEL = ["", "Minor", "Low", "Moderate", "High", "Very high"];
