import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env.server";
import { auditQueue } from "@/lib/queue";
import type { Prisma } from "@prisma/client";
import { locatePractice, searchPlaces } from "./places";
import { selectCompetitors, isPediatric } from "./select";
import { measureHomepage } from "./measure";
import { verifySite, domainLabel, isPlaceholderName } from "./verify";
import { buildLocalComparison } from "./view";
import { generateComparisonNarrative, type ComparisonNarrative } from "./narrative";
import type { CompetitorMeasurement } from "./types";
import type { PerfRow } from "../view/performanceView";

/**
 * Post-audit local comparison. Runs *after* an audit is COMPLETED, in its own
 * job (queue mode) or detached promise (inline mode), with its own time box —
 * it can never change the audit's status, scores or findings, and any failure
 * is logged and swallowed. Budget per audit: 2 Places calls + at most
 * AUDIT_COMPETITORS_MAX PageSpeed runs (homepage, mobile), two at a time.
 *
 * Results live on Competitor rows (source GOOGLE_PLACES): the place id, the
 * name and URL confirmed from the competitor's own website, a derived
 * distance label and our PageSpeed measurement — no other Places content is
 * persisted (Maps Service Terms §14.3). Re-running within 30 days reuses the
 * stored rows and only measures competitors that still lack a measurement.
 */

const json = (v: unknown) => v as Prisma.InputJsonValue;

export const COMPETITOR_JOB = "competitor-intel";
const DISCOVERY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const STAGE_BUDGET_MS = 150_000;

export function competitorIntelAvailable(): { ok: boolean; reason?: string } {
  if (!env.AUDIT_COMPETITORS_ENABLED) return { ok: false, reason: "AUDIT_COMPETITORS_ENABLED is off" };
  if (!env.GOOGLE_PLACES_API_KEY) return { ok: false, reason: "GOOGLE_PLACES_API_KEY not configured" };
  return { ok: true };
}

/** Fire-and-forget entry point used by the engine once an audit completes. */
export async function scheduleCompetitorIntel(auditId: string): Promise<void> {
  if (!competitorIntelAvailable().ok) return;
  if (env.AUDIT_EXECUTION === "queue") {
    await auditQueue.add(COMPETITOR_JOB, { auditId }, { jobId: `${COMPETITOR_JOB}_${auditId}_${Date.now()}` });
    return;
  }
  void runCompetitorIntel(auditId).catch((err) => console.warn(`[Local comparison] ${auditId}: ${err instanceof Error ? err.message : String(err)}`));
}

export async function runCompetitorIntel(auditId: string): Promise<{ status: "skipped" | "done"; reason?: string; competitors: number; measured: number }> {
  const avail = competitorIntelAvailable();
  if (!avail.ok) return { status: "skipped", reason: avail.reason, competitors: 0, measured: 0 };
  const started = Date.now();
  const apiKey = env.GOOGLE_PLACES_API_KEY!;

  const audit = await prisma.audit.findUnique({ where: { id: auditId }, include: { business: true, competitorGaps: true, performance: true } });
  if (!audit || audit.status !== "COMPLETED" || audit.engine !== "CRAWL_V2") return { status: "skipped", reason: "audit not a completed v2 audit", competitors: 0, measured: 0 };
  const business = audit.business;

  // 1. Discovery (reused when fresh). Places content is used transiently for
  //    selection only; what we persist is the place id, plus the name and URL
  //    confirmed from each competitor's own website and a derived distance.
  let rows = audit.competitorGaps.filter((c) => c.source === "GOOGLE_PLACES");
  const fresh = rows.length > 0 && rows.every((r) => r.discoveredAt && Date.now() - r.discoveredAt.getTime() < DISCOVERY_TTL_MS);
  if (!fresh) {
    if (rows.length) await prisma.competitor.deleteMany({ where: { auditId, source: "GOOGLE_PLACES" } });
    const own = await locatePractice({ apiKey, website: business.website, name: business.name, city: business.city });
    const bias = own && own.latitude !== null && own.longitude !== null ? { latitude: own.latitude, longitude: own.longitude, radiusM: env.AUDIT_COMPETITORS_RADIUS_KM * 1000 } : null;
    if (!bias) {
      console.warn(`[Local comparison] ${auditId}: could not locate ${business.name} (${business.website}) on Google Maps — comparison omitted.`);
      return { status: "skipped", reason: "practice location not found", competitors: 0, measured: 0 };
    }
    const pediatric = isPediatric(business.name, own?.types ?? []) || /pediatric|paediatric|kids|children/i.test(business.category);
    const query = `${pediatric ? "pediatric dentist" : "dentist"} in ${business.city}${business.state ? `, ${business.state}` : ""}`;
    const candidates = await searchPlaces({ apiKey, textQuery: query, includedType: "dentist", maxResultCount: 20, bias });
    const selected = selectCompetitors({ audited: { name: business.name, website: business.website, placeId: own?.placeId ?? business.googlePlaceId, category: business.category }, candidates, limit: env.AUDIT_COMPETITORS_MAX + 2, maxDistanceKm: env.AUDIT_COMPETITORS_RADIUS_KM });

    // Verify each candidate on its own website; unreachable sites are dropped. Two extra
    // candidates were selected so a dropped one can be replaced.
    const verified: Array<{ placeId: string; name: string; website: string; relevance: string }> = [];
    for (const c of selected) {
      if (verified.length >= env.AUDIT_COMPETITORS_MAX) break;
      if (Date.now() - started > STAGE_BUDGET_MS / 2) break;
      const site = await verifySite(c.website!);
      if (!site.ok) {
        console.warn(`[Local comparison] ${auditId}: ${c.domain} not verified (${site.error}) — skipped.`);
        continue;
      }
      const km = c.distanceKm;
      const relevance = [isPediatric(c.name, c.types) ? "pediatric dentist" : "dental practice", km !== null ? `about ${km < 1 ? "1" : Math.round(km)} km from your practice` : null].filter(Boolean).join(" · ");
      // Name from the competitor's own site; a placeholder or missing name falls back to the domain (never the Places name).
      verified.push({ placeId: c.placeId, name: site.name ?? domainLabel(site.url) ?? c.domain, website: site.url, relevance });
    }
    if (verified.length < 2) {
      console.warn(`[Local comparison] ${auditId}: ${verified.length} verified competitor(s) near ${business.city} — comparison omitted (need at least 2).`);
      return { status: "skipped", reason: "insufficient comparable competitors", competitors: verified.length, measured: 0 };
    }
    const now = new Date();
    await prisma.competitor.createMany({
      data: verified.map((c, i) => ({ auditId, name: c.name, website: c.website, rank: i + 1, mapScore: null, source: "GOOGLE_PLACES", placeId: c.placeId, address: null, relevance: c.relevance, discoveredAt: now })),
    });
    rows = await prisma.competitor.findMany({ where: { auditId, source: "GOOGLE_PLACES" }, orderBy: { rank: "asc" } });
  }

  // 1b. Repair placeholder names on reused rows (sites whose <title> is a builder default such as
  //     "My Wix Site"): re-read the competitor's own site, else fall back to its domain.
  for (const row of rows) {
    if (!row.website || !isPlaceholderName(row.name)) continue;
    const site = await verifySite(row.website);
    const name = (site.ok && site.name) || domainLabel(row.website);
    if (name !== row.name) {
      await prisma.competitor.update({ where: { id: row.id }, data: { name } });
      row.name = name;
    }
  }

  // 2. Measurement (homepage, mobile) — two at a time, within the stage budget
  // Measure what has no result yet; a previous unavailable result is tried again (transient PSI errors).
  const pending = rows.filter((r) => r.website && (!r.measurementJson || (r.measurementJson as unknown as CompetitorMeasurement).status !== "ok"));
  let measured = 0;
  const psi = { apiKey: env.PAGESPEED_API_KEY ?? env.GOOGLE_PLACES_API_KEY, timeoutMs: 75_000 };
  let next = 0;
  const worker = async () => {
    for (;;) {
      const row = pending[next++];
      if (!row) return;
      const remaining = STAGE_BUDGET_MS - (Date.now() - started);
      let m: CompetitorMeasurement;
      if (remaining < 15_000) m = { strategy: "mobile", url: row.website!, status: "unavailable", error: "comparison time budget exhausted before this run started", performanceScore: null, lcpMs: null, cls: null, tbtMs: null, accessibility: null, bestPractices: null, seo: null, lighthouseVersion: null, analysisUtc: null };
      else m = await measureHomepage(row.website!, { ...psi, timeoutMs: Math.min(psi.timeoutMs, remaining) });
      if (m.status === "ok") measured++;
      await prisma.competitor.update({ where: { id: row.id }, data: { measurementJson: json(m), measuredAt: new Date() } });
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, pending.length || 1) }, worker));

  // 3. Narrative (OpenAI, validated against the data; optional) and cache invalidation.
  const finalRows = await prisma.competitor.findMany({ where: { auditId, source: "GOOGLE_PLACES" }, orderBy: { rank: "asc" } });
  const perfRows = audit.performance.map((p) => ({ url: p.url, strategy: p.strategy, pageType: p.pageType, selectionReason: p.selectionReason, status: p.status, error: p.error, field: p.fieldJson, lab: p.labJson, lcpElement: p.lcpElementJson, diagnostics: p.diagnosticsJson, categories: p.categoriesJson ?? null, agentic: p.agenticJson ?? null, lighthouseVersion: p.lighthouseVersion, analysisUtc: p.analysisUtc ? p.analysisUtc.toISOString() : null })) as unknown as PerfRow[];
  const comparison = buildLocalComparison({ name: business.name, website: business.website, city: business.city }, finalRows, perfRows);
  let narrative: ComparisonNarrative | null = null;
  if (comparison && env.AUDIT_AI_ENABLED) narrative = await generateComparisonNarrative(comparison, { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, timeoutMs: 45_000 });
  // Re-read the summary now: anything saved while this stage ran (opportunity inputs, for one) must survive the merge.
  const latest = await prisma.audit.findUnique({ where: { id: auditId }, select: { summaryJson: true } });
  const summary = ((latest?.summaryJson ?? audit.summaryJson) as Record<string, unknown> | null) ?? {};
  await prisma.audit.update({ where: { id: auditId }, data: { summaryJson: json({ ...summary, localComparisonNarrative: narrative }), pdfStatus: "NOT_REQUESTED" } }).catch(() => undefined);

  const okCount = finalRows.filter((r) => (r.measurementJson as CompetitorMeasurement | null)?.status === "ok").length;
  console.log(`[Local comparison] ${auditId}: ${finalRows.length} competitors, ${okCount} measured, narrative ${narrative ? "ok" : "none"}, ${Date.now() - started} ms`);
  return { status: "done", competitors: finalRows.length, measured };
}
