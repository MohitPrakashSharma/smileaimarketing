import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildLocalComparisonView } from "@/lib/audit/competitors/view";
import type { PerfRow } from "@/lib/audit/view/performanceView";

/**
 * Lightweight poll target for the report page while the post-audit local
 * comparison is still running: returns the stored comparison state (and the
 * comparison itself once ready) for a completed v2 audit. Read-only — it
 * never starts discovery or a PageSpeed run, never counts as a report view,
 * and is the same builder the full report and the PDF use, so the three can
 * never disagree.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ publicToken: string }> }) {
  try {
    const { publicToken } = await params;
    const audit = await prisma.audit.findUnique({ where: { publicToken }, include: { business: true, competitorGaps: true, performance: true } });
    if (!audit) return NextResponse.json({ error: "Audit report not found" }, { status: 404 });
    if (audit.status !== "COMPLETED" || audit.engine !== "CRAWL_V2") return NextResponse.json({ error: "The audit is still running." }, { status: 409 });
    const perfRows = audit.performance.map((p) => ({ url: p.url, strategy: p.strategy, pageType: p.pageType, selectionReason: p.selectionReason, status: p.status, error: p.error, field: p.fieldJson, lab: p.labJson, lcpElement: p.lcpElementJson, diagnostics: p.diagnosticsJson, categories: p.categoriesJson ?? null, agentic: p.agenticJson ?? null, lighthouseVersion: p.lighthouseVersion, analysisUtc: p.analysisUtc ? p.analysisUtc.toISOString() : null })) as unknown as PerfRow[];
    const view = buildLocalComparisonView({ name: audit.business.name, website: audit.business.website, city: audit.business.city }, audit.competitorGaps, perfRows, audit.summaryJson);
    return NextResponse.json({ localComparison: view.state, competitors: view.comparison }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Local comparison poll error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn't load the local comparison right now." }, { status: 500 });
  }
}
