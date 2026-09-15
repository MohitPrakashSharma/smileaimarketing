import type { Finding, DeveloperDetail } from "../findings/groups";
import type { PageAnalysis } from "./schema";
import type { PageEvidence } from "./evidence";
import { priorityScore } from "../priority";
import { shortUrl } from "../core/url";

/**
 * Turns one validated, scrubbed AI analysis into at most ONE client-facing
 * finding for that page — an opportunity, never a defect, never scored.
 * Impact/effort come from a fixed table per field (deterministic), confidence
 * is the model's own confidence scaled and capped at 70 (it is an inference),
 * and every AI item is kept in developerDetails with its provenance.
 */

interface FieldMeta {
  key: keyof PageAnalysis;
  label: string;
  impact: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
}

const OPPORTUNITY_FIELDS: FieldMeta[] = [
  { key: "missingServiceInformation", label: "Decision-making information missing", impact: 4, effort: 3 },
  { key: "conversionWeaknesses", label: "Conversion weaknesses", impact: 4, effort: 2 },
  { key: "topicalGaps", label: "Topical gaps", impact: 3, effort: 3 },
  { key: "faqOpportunities", label: "FAQ opportunities", impact: 3, effort: 2 },
  { key: "trustGaps", label: "Trust and credibility gaps", impact: 3, effort: 2 },
  { key: "internalLinkOpportunities", label: "Internal linking opportunities", impact: 2, effort: 1 },
  { key: "recommendedSections", label: "Sections to add", impact: 3, effort: 3 },
  { key: "headingRecommendations", label: "Suggested heading outline", impact: 2, effort: 2 },
  { key: "contentStructureRecommendations", label: "Content structure", impact: 2, effort: 2 },
];

export const AI_CONFIDENCE_CAP = 70;
export const AI_MIN_CONFIDENCE = 0.35;

const PAGE_LABEL: Record<string, string> = { home: "Homepage", service: "Service page", location: "Location page", conversion: "Contact page", content: "Article", about: "About page", other: "Page", legal: "Page", utility: "Page" };

export function analysisToFinding(analysis: PageAnalysis, evidence: PageEvidence, deterministicCheckIds: string[], isHome: boolean, denominator: number): Finding | null {
  if (analysis.confidence < AI_MIN_CONFIDENCE) return null;
  const items = OPPORTUNITY_FIELDS.map((f) => ({ meta: f, list: analysis[f.key] as string[] })).filter((x) => x.list.length > 0);
  const hasTitle = Boolean(analysis.titleSuggestion);
  const hasMeta = Boolean(analysis.metaDescriptionSuggestion);
  if (items.length === 0 && !hasTitle && !hasMeta) return null;

  const gapKeys = new Set(["missingServiceInformation", "topicalGaps", "trustGaps", "conversionWeaknesses"]);
  const isOpportunity = items.some((x) => gapKeys.has(x.meta.key)) || analysis.intentAlignment === "weak";
  const impact = Math.max(2, ...items.map((x) => x.meta.impact), hasTitle ? 3 : 0) as 1 | 2 | 3 | 4 | 5;
  const effort = Math.min(3, Math.max(1, ...items.map((x) => x.meta.effort))) as 1 | 2 | 3;
  const confidence = Math.min(AI_CONFIDENCE_CAP, Math.round(analysis.confidence * 100));
  const label = PAGE_LABEL[evidence.page.pageType] ?? "Page";
  const path = shortUrl(evidence.page.url);

  const details: DeveloperDetail[] = items.map((x) => ({
    checkId: `ai.${x.meta.key}`,
    title: x.meta.label,
    severity: "OPPORTUNITY",
    dataSource: "ai",
    device: null,
    affectedPageCount: 1,
    detected: null,
    expected: "",
    fix: x.list.map((s) => `• ${s}`).join("\n"),
    developerFix: null,
    urls: [{ url: evidence.page.url }],
  }));
  if (hasTitle || hasMeta) {
    details.unshift({
      checkId: "ai.titleMeta",
      title: "Suggested title / meta description",
      severity: "OPPORTUNITY",
      dataSource: "ai",
      device: null,
      affectedPageCount: 1,
      detected: `current title: ${evidence.page.title ?? "(none)"}`,
      expected: "",
      fix: [hasTitle ? `Title: ${analysis.titleSuggestion}` : null, hasMeta ? `Meta description: ${analysis.metaDescriptionSuggestion}` : null].filter(Boolean).join("\n"),
      developerFix: null,
      urls: [{ url: evidence.page.url }],
    });
  }
  if (analysis.developerNotes.length) {
    details.push({ checkId: "ai.developerNotes", title: "Developer notes", severity: "OPPORTUNITY", dataSource: "ai", device: null, affectedPageCount: 1, detected: null, expected: "", fix: analysis.developerNotes.map((s) => `• ${s}`).join("\n"), developerFix: null, urls: [{ url: evidence.page.url }] });
  }

  const alignment = analysis.intentAlignment === "unknown" ? "" : ` Content alignment with that intent: ${analysis.intentAlignment}.`;
  const why = `${analysis.businessOwnerSummary || `This page appears to serve visitors looking for: ${analysis.pageIntent || "unclear"}.`}${alignment}`.trim();
  const topFixes = items.slice(0, 4).flatMap((x) => x.list.slice(0, 2).map((s) => `• ${s}`));
  const recommendedFix = [`Strengthen this ${label.toLowerCase()} for search and conversion (AI-assisted recommendations, based on the crawled content):`, ...topFixes, hasTitle ? `• Title suggestion: "${analysis.titleSuggestion}"` : null].filter(Boolean).join("\n");

  return {
    findingKey: `ai:page:${evidence.page.path}`,
    checkIds: ["ai.page_analysis", ...deterministicCheckIds],
    pillar: "CONTENT",
    section: "D",
    severity: "OPPORTUNITY",
    title:
      analysis.intentAlignment === "strong"
        ? isHome ? "Homepage: content opportunities to convert more visitors" : `${label}: content opportunities to convert more visitors: ${path}`
        : analysis.intentAlignment === "weak"
          ? isHome ? "Homepage content doesn't match what visitors are looking for" : `${label} needs stronger search & conversion content: ${path}`
          : isHome ? "Homepage content could better match what visitors are looking for" : `${label} could better serve its visitors: ${path}`,
    affectedUrls: [evidence.page.url],
    affectedPageCount: 1,
    evidence: { pageIntent: analysis.pageIntent, intentConfidence: analysis.intentConfidence, intentAlignment: analysis.intentAlignment, observations: analysis.contentQualityObservations, aiConfidence: analysis.confidence, promptEvidenceWords: evidence.page.contentWordsSent },
    detectedValue: `Intent: ${analysis.pageIntent || "unknown"} · alignment ${analysis.intentAlignment} · ${evidence.page.wordCount} words`,
    expectedValue: null,
    whyItMatters: why,
    recommendedFix,
    developerDetails: details,
    impact,
    effort,
    confidence,
    priorityScore: priorityScore({ severity: "OPPORTUNITY", impact, effort, confidence, pageShare: 1 / Math.max(1, denominator), affectsHomepage: isHome }),
    owner: "owner",
    evidenceKind: isOpportunity ? "AI_INFERRED_OPPORTUNITY" : "AI_RECOMMENDATION",
    source: "openai",
    device: null,
    metric: null,
  };
}
