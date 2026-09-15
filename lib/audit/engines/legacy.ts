import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyzeWebsite } from "@/lib/websiteAnalyzer";
import { computeAuditScores } from "@/lib/auditScorer";
import { findLocalMarketPosition } from "@/lib/discoveryProvider";
import { generateAuditSummaryWithOpenAI } from "@/lib/openai";
import { normalizeName } from "@/lib/normalization";
import { pdfQueue } from "@/lib/queue";
import { logEngagementEvent } from "@/lib/events";
import type { EngineResult } from "../engine";

/**
 * The v1 engine, lifted unchanged from dental-worker.ts's analysis job so
 * that the worker and the inline path run identical code. Homepage-only
 * analysis, five category scores, optional OpenAI summary. Kept until the
 * v2 engine replaces it in production (CRAWL_V2).
 */
export async function runLegacyEngine(auditId: string): Promise<EngineResult> {
  const audit = await prisma.audit.findUnique({ where: { id: auditId }, include: { business: true } });
  if (!audit) throw new Error(`Audit ${auditId} not found`);
  const business = audit.business;

  const signals = await analyzeWebsite(business.website);

  const localMarket = await findLocalMarketPosition({
    businessName: business.name,
    website: business.website,
    city: business.city,
    state: business.state || undefined,
    country: business.country,
    category: business.category,
    limit: 3,
  });

  const scoreOutput = computeAuditScores({
    businessName: business.name,
    city: business.city,
    website: business.website,
    signals,
    category: business.category,
    rating: business.rating ?? undefined,
    reviewCount: business.reviewCount ?? undefined,
    realCompetitors: localMarket.competitors,
    ownRank: localMarket.ownRank,
    marketChecked: localMarket.checked,
  });

  // AI is used here only to phrase the summary/email — never to score.
  let finalSummary = scoreOutput.summaryText;
  let aiEmailSubject: string | undefined;
  let aiEmailOpening: string | undefined;
  try {
    const ai = await generateAuditSummaryWithOpenAI({
      businessName: business.name,
      website: business.website,
      city: business.city,
      category: business.category,
      overallScore: scoreOutput.opportunityScore,
      results: scoreOutput.categoryScores.map((c) => ({ category: c.category, score: c.score })),
      competitors: scoreOutput.competitors,
      websiteIssue: signals.reachable ? undefined : signals.error,
    });
    if (ai.summary) finalSummary = ai.summary;
    aiEmailSubject = ai.emailSubject;
    aiEmailOpening = ai.emailOpening;
  } catch (err) {
    console.warn("[Audit v1] OpenAI summary skipped:", err);
  }

  await prisma.auditResult.deleteMany({ where: { auditId } });
  await prisma.competitor.deleteMany({ where: { auditId } });

  for (const c of scoreOutput.categoryScores) {
    await prisma.auditResult.create({
      data: { auditId, category: c.category, score: c.score, findingsJson: c.findingsJson as Prisma.InputJsonObject, detailsJson: c.detailsJson as Prisma.InputJsonObject },
    });
  }
  for (const comp of scoreOutput.competitors) {
    await prisma.competitor.create({
      data: { auditId, name: comp.name, website: comp.website || `https://${normalizeName(comp.name).replace(/\s+/g, "")}.com`, rank: comp.rank, mapScore: comp.mapScore },
    });
  }

  const completed = await prisma.audit.update({
    where: { id: auditId },
    data: { status: "COMPLETED", engine: "LEGACY_V1", score: scoreOutput.opportunityScore, summaryText: finalSummary, completedAt: new Date(), errorMessage: null },
  });
  await prisma.business.update({
    where: { id: business.id },
    data: { status: "AUDITED", opportunityScore: scoreOutput.opportunityScore, lastCheckedAt: new Date() },
  });
  await logEngagementEvent({ eventType: "audit_completed", businessId: business.id, auditId });

  await pdfQueue.add(
    "generate-pdf",
    {
      auditId,
      publicToken: completed.publicToken,
      businessName: business.name,
      city: business.city,
      website: business.website,
      opportunityScore: scoreOutput.opportunityScore,
      summaryText: finalSummary,
      findings: scoreOutput.categoryScores.map((c) => ({ category: c.category, score: c.score, title: c.detailsJson.title, detail: c.detailsJson.description, findingsJson: c.findingsJson })),
      competitors: scoreOutput.competitors,
      category: business.category,
    },
    { jobId: `pdf_${auditId}` }
  );

  return { engine: "LEGACY_V1", score: scoreOutput.opportunityScore, aiEmailSubject, aiEmailOpening };
}
