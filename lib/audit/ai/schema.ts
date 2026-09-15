import { z } from "zod";

/**
 * Structured output contract for the per-page content-intelligence call,
 * plus the unsupported-claim scrubber. Unknown keys are stripped (a model
 * that invents `rankingPosition` or `monthlySearches` loses them silently),
 * strings are length-capped, arrays are size-capped, and every string is
 * passed through `scrubUnsupportedClaims` before it can reach a report.
 */

export const PROMPT_VERSION = "2a.2";

// Lenient on size, strict on shape: an over-long string or list is trimmed to
// its cap rather than invalidating the whole analysis (one extra bullet must
// not cost the page its result). Types and enums stay strict.
const short = (max: number) => z.string().trim().transform((v) => (v.length > max ? v.slice(0, max).replace(/\s+\S*$/, "") : v));
const list = (max: number, itemMax = 240) => z.array(short(itemMax)).transform((a) => a.slice(0, max)).default([]);

export const IntentAlignment = z.enum(["strong", "moderate", "weak", "unknown"]);

export const PageAnalysisSchema = z.object({
  pageIntent: short(200).default(""),
  intentConfidence: z.number().min(0).max(1).default(0),
  intentAlignment: IntentAlignment.default("unknown"),
  contentQualityObservations: list(6),
  topicalGaps: list(6),
  missingServiceInformation: list(6),
  faqOpportunities: list(6),
  trustGaps: list(5),
  conversionWeaknesses: list(5),
  internalLinkOpportunities: list(5),
  titleSuggestion: short(120).nullable().default(null),
  metaDescriptionSuggestion: short(220).nullable().default(null),
  headingRecommendations: list(8),
  contentStructureRecommendations: list(6),
  recommendedSections: list(8),
  businessOwnerSummary: short(700).default(""),
  developerNotes: list(6, 300),
  confidence: z.number().min(0).max(1).default(0),
});

export type PageAnalysis = z.infer<typeof PageAnalysisSchema>;

/**
 * Sentences that assert data we never collected are removed wholesale.
 * These patterns cover rankings/positions, search volume, traffic, backlinks,
 * authority metrics, conversion rates, penalties, Search Console and Core
 * Web Vitals / PageSpeed numbers (which come from PageSpeed, never from AI).
 */
const CLAIM_PATTERNS: RegExp[] = [
  /\b(rank(?:s|ed|ing)?|position(?:ed|s)?)\b[^.]{0,40}?#?\s*\d+/i,
  /\b#\s?\d+\b[^.]{0,30}\b(google|search|serp|results?)\b/i,
  /\bpage\s+(one|two|three|1|2|3)\b[^.]{0,20}\b(of\s+)?google\b/i,
  /\b\d[\d,.]*\s*(k|thousand|million|m)?\s*(monthly\s+)?(searches|search volume|search queries|impressions|clicks|visits|visitors|sessions|traffic|pageviews)\b/i,
  /\b(search volume|monthly searches|keyword volume|traffic estimate|organic traffic)\b/i,
  /\b(backlinks?|referring domains?|domain authority|domain rating|page authority|\bDA\s?\d+|\bDR\s?\d+|trust flow|citation flow)\b/i,
  /\b(conversion rate|bounce rate|click-through rate|ctr)\b[^.]{0,20}\d/i,
  /\b(google\s+)?(penalt(?:y|ies|ised|ized)|manual action|algorithm(?:ic)? (?:hit|penalty))\b/i,
  /\bsearch console\b/i,
  /\b(competitors?|rivals?)\b[^.]{0,60}\b(more|less|higher|lower)\s+(traffic|rankings?|visitors|authority|backlinks)\b/i,
  /\b(lcp|inp|cls|fcp|ttfb|core web vitals|pagespeed|lighthouse|page ?speed score)\b[^.]{0,40}\d/i,
  /\b(indexed|de-?indexed|not indexed)\b[^.]{0,30}\b(by google|in google)\b/i,
  /\b(users?|visitors?)\s+(are|were)\s+(leaving|bouncing|abandoning)\b/i,
  /\byou(?:r site)? (currently )?(rank|ranks|ranking)\b/i,
];

export interface ScrubResult<T> {
  value: T;
  removed: Array<{ path: string; text: string; pattern: string }>;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/).map((s) => s.trim()).filter(Boolean);
}

export function scrubString(text: string, path: string, removed: ScrubResult<unknown>["removed"]): string {
  const kept: string[] = [];
  for (const sentence of splitSentences(text)) {
    const hit = CLAIM_PATTERNS.find((p) => p.test(sentence));
    if (hit) removed.push({ path, text: sentence, pattern: hit.source.slice(0, 60) });
    else kept.push(sentence);
  }
  return kept.join(" ");
}

/** Deep-scrubs every string in a validated analysis. Empty results after scrubbing are dropped from arrays / nulled. */
export function scrubUnsupportedClaims(analysis: PageAnalysis): ScrubResult<PageAnalysis> {
  const removed: ScrubResult<unknown>["removed"] = [];
  const out = { ...analysis } as Record<string, unknown>;
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === "string") {
      const s = scrubString(value, key, removed);
      out[key] = s || (key === "titleSuggestion" || key === "metaDescriptionSuggestion" ? null : "");
    } else if (Array.isArray(value)) {
      out[key] = value.map((v) => (typeof v === "string" ? scrubString(v, key, removed) : v)).filter((v) => typeof v !== "string" || v.length > 0);
    }
  }
  // Suggestions that exceed what fits in a SERP are not suggestions — drop rather than truncate mid-word.
  if (typeof out.titleSuggestion === "string" && out.titleSuggestion.length > 70) {
    removed.push({ path: "titleSuggestion", text: out.titleSuggestion, pattern: "over 70 chars" });
    out.titleSuggestion = null;
  }
  if (typeof out.metaDescriptionSuggestion === "string" && out.metaDescriptionSuggestion.length > 165) {
    removed.push({ path: "metaDescriptionSuggestion", text: out.metaDescriptionSuggestion, pattern: "over 165 chars" });
    out.metaDescriptionSuggestion = null;
  }
  return { value: out as PageAnalysis, removed };
}

/** Parses + validates raw model text. Returns null (with the issue) when it isn't usable. */
export function parseAnalysis(raw: string): { ok: true; value: PageAnalysis } | { ok: false; error: string } {
  let json: unknown;
  try {
    // Tolerate a fenced ```json block.
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    json = JSON.parse(cleaned);
  } catch (e) {
    return { ok: false, error: `not valid JSON: ${(e as Error).message}` };
  }
  const parsed = PageAnalysisSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: `schema: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}` };
  return { ok: true, value: parsed.data };
}
