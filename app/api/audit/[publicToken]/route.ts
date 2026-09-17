import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildAuditNarrative } from "@/lib/auditNarrative";
import { trackEvent } from "@/lib/analytics";
import { buildV2Payload, legacyShapeFromV2 } from "@/lib/audit/report";
import type { AuditProgress } from "@/lib/audit/progress";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params;

    const audit = await prisma.audit.findUnique({
      where: { publicToken },
      include: {
        business: true,
        results: true,
        competitorGaps: true,
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit report not found" }, { status: 404 });
    }

    const businessOut = {
      name: audit.business.name,
      website: audit.business.website,
      city: audit.business.city,
      category: audit.business.category,
      opportunityScore: audit.score,
    };

    // Still running (either engine): return status + progress so the page
    // can poll. Scores are never present here.
    if (audit.status !== "COMPLETED") {
      const [findings, pages] = audit.engine === "CRAWL_V2"
        ? await Promise.all([prisma.auditFinding.findMany({ where: { auditId: audit.id } }), prisma.auditPage.findMany({ where: { auditId: audit.id } })])
        : [[], []];
      return NextResponse.json({
        status: audit.status,
        engine: audit.engine,
        business: businessOut,
        checkedAt: audit.createdAt,
        progress: (audit.progressJson as unknown as AuditProgress | null) ?? null,
        errorMessage: audit.status === "FAILED" ? audit.errorMessage : null,
        // Verified-so-far findings (titles/severity), no scores.
        findingsSoFar: findings.slice().sort((a, b) => b.priorityScore - a.priorityScore).map((f) => ({ title: f.title, severity: f.severity, pillar: f.pillar, affectedPageCount: f.affectedPageCount })),
        pagesCrawled: pages.filter((p) => p.statusCode !== null).length,
      });
    }

    // v2 engine: new payload + the legacy 5-card shape the current UI/PDF read.
    if (audit.engine === "CRAWL_V2") {
      const [findings, pages, checks, performance, ai] = await Promise.all([
        prisma.auditFinding.findMany({ where: { auditId: audit.id } }),
        prisma.auditPage.findMany({ where: { auditId: audit.id }, orderBy: { depth: "asc" } }),
        prisma.auditCheckResult.findMany({ where: { auditId: audit.id } }),
        prisma.auditPerformance.findMany({ where: { auditId: audit.id } }),
        prisma.auditAiPageAnalysis.findMany({ where: { auditId: audit.id } }),
      ]);
      prisma.audit.update({ where: { id: audit.id }, data: { viewCount: { increment: 1 }, lastViewedAt: new Date() } }).catch(() => undefined);
      void trackEvent({ eventName: "report_view", businessId: audit.businessId, auditId: audit.id });
      const legacy = legacyShapeFromV2(audit, findings, pages, { name: audit.business.name, city: audit.business.city, category: audit.business.category });
      return NextResponse.json({
        status: audit.status,
        engine: audit.engine,
        business: { ...businessOut, opportunityScore: audit.overallScore ?? audit.score },
        checkedAt: audit.completedAt ?? audit.createdAt,
        summary: audit.summaryText,
        narrative: legacy.narrative,
        scorecard: legacy.scorecard,
        findings: legacy.cards,
        competitors: audit.competitorGaps.map((c) => ({ name: c.name, rank: c.rank, mapScore: c.mapScore })),
        v2: buildV2Payload(audit, findings, pages, checks, performance, ai, audit.competitorGaps, { name: audit.business.name, website: audit.business.website, city: audit.business.city }),
      });
    }

    // Record the view — best-effort, must not block/fail the response.
    prisma.audit
      .update({
        where: { id: audit.id },
        data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
      })
      .catch((err) => console.error("Failed to record audit view:", err));

    void trackEvent({ eventName: "report_view", businessId: audit.businessId, auditId: audit.id });

    // Format the response payload safely
    const scorecard = {
      localVisibility: audit.results.find((r) => r.category === "LOCAL_VISIBILITY")?.score || 0,
      websiteQuality: audit.results.find((r) => r.category === "WEBSITE_QUALITY")?.score || 0,
      conversionExperience: audit.results.find((r) => r.category === "CONVERSION")?.score || 0,
      reviewsReputation: audit.results.find((r) => r.category === "REPUTATION")?.score || 0,
      competitorGap: audit.results.find((r) => r.category === "COMPETITOR_GAP")?.score || 0,
    };

    const findings = audit.results.map((r) => {
      const details = (r.detailsJson as Record<string, unknown> | null) || {};
      return {
        category: r.category,
        score: r.score,
        title: typeof details.title === "string" ? details.title : r.category,
        detail: typeof details.description === "string" ? details.description : "No description provided.",
        recommendation: typeof details.recommendation === "string" ? details.recommendation : null,
        // Raw real facts behind the score (rating, review count, verified rank, etc.) —
        // lets the report state the exact SEO gap instead of just a number.
        findings: (r.findingsJson as Record<string, unknown> | null) || {},
      };
    });

    const competitors = audit.competitorGaps.map((c) => ({
      name: c.name,
      rank: c.rank,
      mapScore: c.mapScore,
    }));

    const narrative = buildAuditNarrative({
      businessName: audit.business.name,
      city: audit.business.city,
      category: audit.business.category,
      findings: audit.results.map((r) => ({
        category: r.category,
        score: r.score,
        findingsJson: (r.findingsJson as Record<string, unknown>) || {},
      })),
      competitors,
    });

    return NextResponse.json({
      status: audit.status,
      engine: audit.engine,
      business: businessOut,
      checkedAt: audit.createdAt,
      // The real, AI-written (or honest deterministic fallback) plain-English
      // synthesis of this specific audit — was computed at audit time but
      // never actually sent to the report page until now.
      summary: audit.summaryText,
      narrative,
      scorecard,
      findings,
      competitors,
    });
  } catch (error) {
    console.error("Fetch audit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
