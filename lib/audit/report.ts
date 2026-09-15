import type { Audit, AuditFinding, AuditPage, AuditCheckResult } from "@prisma/client";
import { industryFromCategory, cap } from "@/lib/industry";
import { gradeFor } from "./scoring";
import { bucketFor, SEVERITY_ORDER } from "./priority";
import type { AuditProgress } from "./progress";
import type { Severity } from "./checks/types";

/**
 * Shapes v2 database rows into (a) the new report payload and (b) the
 * legacy 5-card shape the existing report UI / PDF generator consume, so
 * V1 and V2 audits can be compared in the same page without a UI rewrite.
 * Deterministic; the Phase-3 AI summary will read from the same rows.
 */

export interface V2ReportPayload {
  engine: "CRAWL_V2";
  status: Audit["status"];
  progress: AuditProgress | null;
  scoresLocked: boolean;
  scores: null | {
    overall: number | null;
    technical: number | null;
    content: number | null;
    search: number | null;
    local: number | null;
    grades: Record<"overall" | "technical" | "content" | "search" | "local", ReturnType<typeof gradeFor>>;
    breakdown: unknown;
  };
  severityCounts: Record<Severity, number>;
  crawlStats: unknown;
  findings: Array<{
    id: string;
    findingKey: string;
    checkIds: string[];
    pillar: AuditFinding["pillar"];
    section: string;
    severity: Severity;
    title: string;
    affectedUrls: string[];
    affectedPageCount: number;
    detectedValue: string | null;
    expectedValue: string | null;
    whyItMatters: string;
    recommendedFix: string;
    developerDetails: unknown;
    evidence: unknown;
    impact: number;
    effort: number;
    confidence: number;
    priorityScore: number;
    owner: string;
    bucket: ReturnType<typeof bucketFor>;
  }>;
  pages: Array<{ url: string; statusCode: number | null; title: string | null; indexable: boolean | null; wordCount: number | null; depth: number | null; fetchMs: number | null }>;
  checks: Array<{ checkId: string; pillar: string; status: string; severity: string | null; affectedPageCount: number; pageShare: number; weight: number; penalty: number; reason: string | null }>;
}

export function severityCounts(findings: Pick<AuditFinding, "severity">[]): Record<Severity, number> {
  const c: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, OPPORTUNITY: 0 };
  for (const f of findings) c[f.severity as Severity]++;
  return c;
}

export function buildV2Payload(audit: Audit, findings: AuditFinding[], pages: AuditPage[], checks: AuditCheckResult[]): V2ReportPayload {
  const progress = (audit.progressJson as unknown as AuditProgress | null) ?? null;
  const scoresLocked = audit.status === "COMPLETED" && audit.overallScore !== null;
  return {
    engine: "CRAWL_V2",
    status: audit.status,
    progress,
    scoresLocked,
    scores: scoresLocked
      ? {
          overall: audit.overallScore,
          technical: audit.technicalScore,
          content: audit.contentScore,
          search: audit.searchScore,
          local: audit.localScore,
          grades: { overall: gradeFor(audit.overallScore), technical: gradeFor(audit.technicalScore), content: gradeFor(audit.contentScore), search: gradeFor(audit.searchScore), local: gradeFor(audit.localScore) },
          breakdown: audit.scoreBreakdownJson,
        }
      : null,
    severityCounts: severityCounts(findings),
    crawlStats: audit.crawlStatsJson,
    findings: findings
      .slice()
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .map((f) => ({
        id: f.id,
        findingKey: f.findingKey,
        checkIds: (f.checkIdsJson as string[]) ?? [],
        pillar: f.pillar,
        section: f.section,
        severity: f.severity as Severity,
        title: f.title,
        affectedUrls: (f.affectedUrlsJson as string[]) ?? [],
        affectedPageCount: f.affectedPageCount,
        detectedValue: f.detectedValue,
        expectedValue: f.expectedValue,
        whyItMatters: f.whyItMatters,
        recommendedFix: f.recommendedFix,
        developerDetails: f.developerDetailsJson,
        evidence: f.evidenceJson,
        impact: f.impact,
        effort: f.effort,
        confidence: f.confidence,
        priorityScore: f.priorityScore,
        owner: f.owner,
        bucket: bucketFor({ severity: f.severity as Severity, impact: f.impact, effort: f.effort }),
      })),
    pages: pages.map((p) => ({ url: p.url, statusCode: p.statusCode, title: p.title, indexable: p.indexable, wordCount: p.wordCount, depth: p.depth, fetchMs: p.fetchMs })),
    checks: checks.map((c) => ({ checkId: c.checkId, pillar: c.pillar, status: c.status, severity: c.severity, affectedPageCount: c.affectedPageCount, pageShare: c.pageShare, weight: c.weight, penalty: c.penalty, reason: c.reason })),
  };
}

// ---------- legacy compatibility (existing report UI + PDF) ----------

export interface LegacyCard {
  category: string;
  score: number;
  title: string;
  detail: string;
  recommendation: string | null;
  findings: Record<string, unknown>;
}

const SEVERITY_LABEL: Record<Severity, string> = { CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low", OPPORTUNITY: "Opportunity" };

export function legacyShapeFromV2(audit: Audit, findings: AuditFinding[], pages: AuditPage[], business: { name: string; city: string; category: string }) {
  const ind = industryFromCategory(business.category);
  const counts = severityCounts(findings);
  const sorted = findings.slice().sort((a, b) => b.priorityScore - a.priorityScore);
  const crawled = pages.filter((p) => p.statusCode !== null).length;
  const byPillar = (pillar: AuditFinding["pillar"]) => sorted.filter((f) => f.pillar === pillar);

  const card = (category: string, score: number | null, title: string, pillar: AuditFinding["pillar"], fallback: string): LegacyCard => {
    const mine = byPillar(pillar);
    const top = mine.slice(0, 3).map((f) => f.title);
    return {
      category,
      score: score ?? 50,
      title,
      detail: score === null ? fallback : mine.length ? `${mine.length} finding${mine.length === 1 ? "" : "s"} — ${top.join("; ")}.` : "No problems found in the checks we ran.",
      recommendation: mine[0] ? mine[0].recommendedFix.split("\n")[0] : null,
      findings: { measured: score !== null, findingCount: mine.length, worstSeverity: mine[0]?.severity ?? null },
    };
  };

  const cards: LegacyCard[] = [
    card("TECHNICAL", audit.technicalScore, "Technical SEO", "TECHNICAL", "Not measured."),
    card("CONTENT", audit.contentScore, "On-page & content", "CONTENT", "Not measured."),
    card("SEARCH", audit.searchScore, "Search opportunity", "SEARCH", "Ranking and keyword data are collected in a later phase — not measured in this audit."),
    card("LOCAL", audit.localScore, "Local SEO", "LOCAL", business.city ? "Google Business Profile and map-pack data are collected in a later phase — not measured in this audit." : "No physical location detected — local SEO not applicable."),
  ];

  const top = sorted[0];
  const headline = !top
    ? { line1: "Solid Foundations.", line2: "Nothing Urgent Found." }
    : counts.CRITICAL > 0
      ? { line1: `${counts.CRITICAL} Critical Issue${counts.CRITICAL === 1 ? "" : "s"}`, line2: `Are Holding ${business.name} Back.` }
      : { line1: "Here's Exactly", line2: `What's Costing You ${cap(ind.customers)}.` };
  const dek = top
    ? `We crawled ${crawled} page${crawled === 1 ? "" : "s"} of ${business.name}'s site and verified ${findings.length} finding${findings.length === 1 ? "" : "s"}. The biggest: ${top.title.toLowerCase()}.`
    : `We crawled ${crawled} page${crawled === 1 ? "" : "s"} and found nothing that needs urgent attention.`;

  const narrative = {
    headline,
    dek,
    stats: [
      { value: String(crawled), label: "Pages crawled", caption: audit.crawlStatsJson && (audit.crawlStatsJson as { budgetHit?: string }).budgetHit !== "none" ? "crawl budget reached" : "full crawl" },
      { value: String(counts.CRITICAL + counts.HIGH), label: "Critical + high issues", caption: `${counts.MEDIUM} medium · ${counts.LOW} low` },
      { value: audit.technicalScore !== null ? `${audit.technicalScore}` : "—", label: "Technical health", caption: "out of 100" },
      { value: audit.contentScore !== null ? `${audit.contentScore}` : "—", label: "Content health", caption: "out of 100" },
    ],
    fixCards: sorted.slice(0, 5).map((f) => ({
      title: f.title,
      detail: f.whyItMatters,
      impact: `${SEVERITY_LABEL[f.severity as Severity]} · affects ${f.affectedPageCount} page${f.affectedPageCount === 1 ? "" : "s"} · effort ${f.effort}/5`,
    })),
    quietLeaks: sorted.slice(5, 7).map((f) => ({ title: f.title, detail: f.recommendedFix.split("\n")[0] })),
  };

  const scorecard = {
    localVisibility: audit.localScore ?? 0,
    websiteQuality: audit.technicalScore ?? 0,
    conversionExperience: audit.contentScore ?? 0,
    reviewsReputation: 0,
    competitorGap: audit.searchScore ?? 0,
  };

  return { cards, narrative, scorecard, severityOrder: SEVERITY_ORDER };
}
