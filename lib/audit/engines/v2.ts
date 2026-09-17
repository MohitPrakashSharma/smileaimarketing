import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env.server";
import { pdfQueue } from "@/lib/queue";
import { logEngagementEvent } from "@/lib/events";
import { industryFromCategory } from "@/lib/industry";
import { Fetcher } from "../core/fetch";
import { crawlSite } from "../core/crawler";
import { hostOf, ensureScheme, normalizeUrl } from "../core/url";
import type { CrawlResult, CrawledPage } from "../core/types";
import { buildCheckContext, runChecks } from "../checks";
import type { CheckRun, CheckContext } from "../checks/types";
import { buildFindings, type Finding } from "../findings/groups";
import { computeScores, type Scores } from "../scoring";
import { initialProgress, advance, setStageDetail, failProgress, type AuditProgress } from "../progress";
import { legacyShapeFromV2 } from "../report";
import type { EngineResult } from "../engine";
import { runPerformanceStage } from "../stages/performance";
import { compareFindings } from "../priority";
import { scheduleCompetitorIntel } from "../competitors/stage";
import { runAiStage, type AiPageOutcome } from "../stages/ai";
import type { PerfResult } from "../providers/pagespeed";
import type { SelectedPage } from "../pages/select";

/**
 * Engine v2: crawl → deterministic checks → grouped findings → scores.
 *
 * Progress is written to Audit.progressJson at each stage; findings are
 * persisted after each pillar so the report can show verified items while
 * the audit is still running. Scores are written once, at finalize, and
 * only then does `scoresLocked` become true (plan §0.2). No AI anywhere in
 * this file.
 */

const json = (v: unknown) => v as Prisma.InputJsonValue;

export interface V2Options {
  trigger: "self_serve" | "admin" | "campaign";
  maxPages?: number;
  maxDurationMs?: number;
}

export async function runV2Engine(auditId: string, opts: V2Options): Promise<EngineResult> {
  const audit = await prisma.audit.findUnique({ where: { id: auditId }, include: { business: true } });
  if (!audit) throw new Error(`Audit ${auditId} not found`);
  const business = audit.business;
  const industry = industryFromCategory(business.category);
  const maxPages = opts.maxPages ?? (opts.trigger === "admin" ? env.AUDIT_MAX_PAGES_ADMIN : env.AUDIT_MAX_PAGES);
  const maxDurationMs = opts.maxDurationMs ?? env.AUDIT_MAX_DURATION_MS;

  let progress = initialProgress("CRAWL_V2");
  let lastWrite = 0;
  const writeProgress = async (p: AuditProgress, force = false) => {
    progress = p;
    if (!force && Date.now() - lastWrite < 700) return;
    lastWrite = Date.now();
    await prisma.audit.update({ where: { id: auditId }, data: { progressJson: json(p) } });
  };

  await prisma.audit.update({
    where: { id: auditId },
    data: { engine: "CRAWL_V2", startedAt: new Date(), completedAt: null, errorMessage: null, configJson: json({ maxPages, maxDurationMs, trigger: opts.trigger }), progressJson: json(progress), overallScore: null, technicalScore: null, contentScore: null, performanceScore: null, searchScore: null, localScore: null, scoreBreakdownJson: Prisma.JsonNull },
  });
  await prisma.auditPage.deleteMany({ where: { auditId } });
  await prisma.auditFinding.deleteMany({ where: { auditId } });
  await prisma.auditCheckResult.deleteMany({ where: { auditId } });
  await prisma.auditPerformance.deleteMany({ where: { auditId } });
  await prisma.auditAiPageAnalysis.deleteMany({ where: { auditId } });

  try {
    // --- detect ---
    const seed = normalizeUrl(ensureScheme(business.website));
    if (!seed) throw new Error(`Invalid website URL: ${business.website}`);
    const siteHost = hostOf(seed)!;
    await writeProgress(advance(progress, "sitemap", {}, `${siteHost} · ${industry.label}${business.city ? ` · ${business.city}` : ""}`), true);

    // --- crawl ---
    const fetcher = new Fetcher();
    const crawl: CrawlResult = await crawlSite(fetcher, seed, {
      budget: { maxPages, maxDurationMs },
      onProgress: async (e) => {
        if (e.stage === "sitemap") await writeProgress(setStageDetail(progress, "sitemap", e.detail ?? ""), true);
        else if (e.stage === "probe") await writeProgress(setStageDetail(advance(progress, "crawl", { pagesCrawled: e.pagesCrawled, pagesDiscovered: e.pagesDiscovered }), "crawl", e.detail ?? "checking links"), true);
        else await writeProgress(setStageDetail(advance(progress, "crawl", { pagesCrawled: e.pagesCrawled, pagesDiscovered: e.pagesDiscovered }), "crawl", `${e.pagesCrawled} of ${Math.min(e.pagesDiscovered, maxPages)}`), false);
      },
    });
    await persistPages(auditId, crawl.pages);
    const crawlDetail = `${crawl.stats.pagesCrawled} page${crawl.stats.pagesCrawled === 1 ? "" : "s"}${crawl.stats.budgetHit !== "none" ? ` (budget: ${crawl.stats.budgetHit})` : ""}`;
    await writeProgress(advance(progress, "technical", { pagesCrawled: crawl.stats.pagesCrawled, pagesDiscovered: crawl.stats.pagesDiscovered, previewReady: true }, crawlDetail), true);
    await prisma.audit.update({ where: { id: auditId }, data: { crawlStatsJson: json(crawl.stats) } });

    // --- checks, pillar by pillar, persisting findings progressively ---
    const ctx: CheckContext = buildCheckContext(crawl, { name: business.name, city: business.city || undefined, industry }, siteHost);
    const technicalRuns = runChecks(ctx, ["TECHNICAL"]);
    await persistChecks(auditId, technicalRuns);
    let findings = buildFindings(technicalRuns, ctx);
    await persistFindings(auditId, findings);
    await writeProgress(advance(progress, "content", { findingsSoFar: findings.length }, `${technicalRuns.filter((r) => r.outcome.status === "FAIL").length} issues in ${technicalRuns.length} checks`), true);

    const contentRuns = runChecks(ctx, ["CONTENT"]);
    await persistChecks(auditId, contentRuns);
    let allRuns: CheckRun[] = [...technicalRuns, ...contentRuns];
    findings = buildFindings(allRuns, ctx);
    await persistFindings(auditId, findings);
    await writeProgress(advance(progress, "performance", { findingsSoFar: findings.length }, `${contentRuns.filter((r) => r.outcome.status === "FAIL").length} issues in ${contentRuns.length} checks`), true);

    // --- performance (PageSpeed Insights on representative pages) ---
    // The stage is isolated: any unexpected error (provider, persistence)
    // leaves the pillar "not measured" and the audit continues — PageSpeed
    // enriches the SEO audit, it never blocks it.
    let perfResults: PerfResult[] = [];
    let perfSelected: SelectedPage[] = [];
    if (env.AUDIT_PSI_ENABLED && ctx.htmlPages.length > 0) {
      try {
        const perf = await runPerformanceStage(ctx, {
          maxPages: opts.trigger === "admin" ? env.AUDIT_PSI_MAX_PAGES_ADMIN : env.AUDIT_PSI_MAX_PAGES,
          // PAGESPEED_API_KEY, else the existing Google key (works once the PageSpeed Insights API is enabled on its project), else keyless.
          psi: { apiKey: env.PAGESPEED_API_KEY ?? env.GOOGLE_PLACES_API_KEY },
          onProgress: async (done, total, detail) => writeProgress(setStageDetail(progress, "performance", detail), done === total),
        });
        perfResults = perf.results;
        perfSelected = perf.selected;
        await persistPerformance(auditId, perf.results, perf.selected);
        ctx.performance = perfResults;
        const perfRuns = runChecks(ctx, ["PERFORMANCE"]);
        await persistChecks(auditId, perfRuns);
        allRuns = [...allRuns, ...perfRuns];
        findings = buildFindings(allRuns, ctx);
        await persistFindings(auditId, findings);
        const okRuns = perfResults.filter((r) => r.status === "ok").length;
        progress = setStageDetail(progress, "performance", okRuns ? `${okRuns}/${perfResults.length} PageSpeed runs · ${perfSelected.length} page${perfSelected.length === 1 ? "" : "s"}` : "PageSpeed unavailable — not measured", okRuns ? "done" : "skipped");
      } catch (err) {
        console.warn(`[Audit v2] performance stage failed for ${auditId}: ${err instanceof Error ? err.message : String(err)}`);
        // Roll the pillar back to "not measured": no performance runs in the ledger, findings rebuilt without them.
        ctx.performance = [];
        perfResults = [];
        perfSelected = [];
        allRuns = allRuns.filter((r) => r.def.pillar !== "PERFORMANCE");
        await prisma.auditCheckResult.deleteMany({ where: { auditId, pillar: "PERFORMANCE" } });
        findings = buildFindings(allRuns, ctx);
        await persistFindings(auditId, findings);
        progress = setStageDetail(progress, "performance", "PageSpeed unavailable — not measured", "skipped");
      }
    } else {
      progress = setStageDetail(progress, "performance", ctx.htmlPages.length ? "disabled" : "no pages to test", "skipped");
    }
    await writeProgress(advance(progress, "ai", { findingsSoFar: findings.length }), true);

    // --- AI content intelligence (interpretation only; never scored) ---
    if (env.AUDIT_AI_ENABLED && ctx.htmlPages.length > 0) {
      const ai = await runAiStage(ctx, allRuns, {
        client: { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL },
        maxPages: opts.trigger === "admin" ? env.AUDIT_AI_MAX_PAGES_ADMIN : env.AUDIT_AI_MAX_PAGES,
        onProgress: async (done, total, detail) => writeProgress(setStageDetail(progress, "ai", detail), done === total),
      });
      await persistAi(auditId, ai.outcomes);
      if (ai.findings.length) {
        findings = [...findings, ...ai.findings].sort(compareFindings);
        await persistFindings(auditId, findings);
      }
      const okAi = ai.outcomes.filter((o) => o.status === "ok").length;
      progress = setStageDetail(progress, "ai", ai.haltedBy ? `unavailable — ${ai.haltedBy.code.replace(/_/g, " ")}` : okAi ? `${okAi}/${ai.outcomes.length} pages analysed` : "no pages analysed", okAi ? "done" : "skipped");
      if (ai.haltedBy) console.warn(`[Audit v2] AI stage halted: ${ai.haltedBy.code} — ${ai.haltedBy.message}`);
    } else {
      progress = setStageDetail(progress, "ai", "disabled", "skipped");
    }
    await writeProgress(advance(progress, "search", { findingsSoFar: findings.length }), true);

    // Search pillar: verified ranking data would come from a future Search Console provider — recorded as skipped, not faked.
    progress = setStageDetail(progress, "search", "ranking data not collected in this version", "skipped");
    await writeProgress(advance(progress, "finalize", {}), true);

    // --- scores (only now) ---
    const scores: Scores = computeScores(allRuns, { localRelevant: ctx.business.hasLocation, searchMeasured: false, measurable: ctx.htmlPages.length > 0 });
    const completed = await prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        score: scores.overall ?? 0,
        overallScore: scores.overall,
        technicalScore: scores.technical.score,
        contentScore: scores.content.score,
        performanceScore: scores.performance.score,
        searchScore: scores.search.score,
        localScore: scores.local.score,
        scoreBreakdownJson: json({ technical: scores.technical, content: scores.content, performance: scores.performance, search: scores.search, local: scores.local }),
        summaryText: buildDeterministicSummary(business.name, crawl, findings, scores),
        progressJson: json(advance(progress, "done", { findingsSoFar: findings.length, scoresLocked: true })),
      },
    });
    await prisma.business.update({
      where: { id: business.id },
      data: { status: "AUDITED", opportunityScore: scores.overall === null ? 0 : 100 - scores.overall, lastCheckedAt: new Date() },
    });
    await logEngagementEvent({ eventType: "audit_completed", businessId: business.id, auditId });

    // PDF: the Phase-1 PDF renders the compatibility shape; a v2 PDF layout is Phase 3.
    const [dbFindings, dbPages] = await Promise.all([prisma.auditFinding.findMany({ where: { auditId } }), prisma.auditPage.findMany({ where: { auditId } })]);
    const legacy = legacyShapeFromV2(completed, dbFindings, dbPages, { name: business.name, city: business.city, category: business.category });
    await pdfQueue.add(
      "generate-pdf",
      {
        engine: "CRAWL_V2",
        auditId,
        publicToken: completed.publicToken,
        businessName: business.name,
        city: business.city,
        website: business.website,
        opportunityScore: scores.overall ?? 0,
        summaryText: completed.summaryText,
        findings: legacy.cards.map((c) => ({ category: c.category, score: c.score, title: c.title, detail: c.detail, findingsJson: c.findings })),
        competitors: [],
        category: business.category,
      },
      { jobId: `pdf_${auditId}_${Date.now()}` }
    );

    // Local comparison runs after completion, in its own job/promise, and can never
    // fail or delay the audit (off unless AUDIT_COMPETITORS_ENABLED).
    await scheduleCompetitorIntel(auditId).catch((err) => console.warn(`[Audit v2] could not schedule local comparison for ${auditId}: ${err instanceof Error ? err.message : String(err)}`));

    return { engine: "CRAWL_V2", score: scores.overall ?? 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.audit.update({ where: { id: auditId }, data: { status: "FAILED", errorMessage: message, progressJson: json(failProgress(progress, message)) } });
    throw err;
  }
}

async function persistPages(auditId: string, pages: CrawledPage[]) {
  if (!pages.length) return;
  await prisma.auditPage.createMany({
    data: pages.map((p) => ({
      auditId,
      url: p.url,
      finalUrl: p.finalUrl,
      statusCode: p.statusCode,
      fetchError: p.fetchError,
      redirectChainJson: json(p.redirectChain),
      contentType: p.contentType,
      depth: p.depth,
      discoveredVia: p.discoveredVia,
      parentUrl: p.parentUrl,
      inSitemap: p.inSitemap,
      fetchMs: p.fetchMs,
      htmlBytes: p.htmlBytes,
      isHttps: p.isHttps,
      mixedContent: p.facts ? p.facts.mixedContentUrls.length > 0 : null,
      title: p.facts?.title ?? null,
      metaDescription: p.facts?.metaDescription ?? null,
      canonical: p.facts?.canonical ?? null,
      robotsMeta: p.facts?.robotsMeta ?? null,
      xRobotsTag: p.xRobotsTag,
      indexable: p.indexable,
      lang: p.facts?.lang ?? null,
      charset: p.facts?.charset ?? null,
      hasDoctype: p.facts?.hasDoctype ?? null,
      viewport: p.facts?.viewport ?? null,
      h1Json: p.facts ? json(p.facts.h1) : undefined,
      headingCountsJson: p.facts ? json(p.facts.headingCounts) : undefined,
      wordCount: p.facts?.wordCount ?? null,
      textHash: p.facts?.textHash ?? null,
      imagesTotal: p.facts?.images.length ?? null,
      imagesMissingAlt: p.facts ? p.facts.images.filter((i) => i.alt === null).length : null,
      imagesNoDimensions: p.facts ? p.facts.images.filter((i) => !i.hasDimensions).length : null,
      internalLinks: p.facts ? p.facts.links.filter((l) => l.internal).length : null,
      externalLinks: p.facts ? p.facts.links.filter((l) => !l.internal).length : null,
      schemaTypesJson: p.facts ? json(p.facts.schemaTypes) : undefined,
      schemaErrors: p.facts?.schemaErrors ?? null,
      hasTelLink: p.facts?.hasTelLink ?? null,
      hasForm: p.facts?.hasForm ?? null,
      hasPrimaryCta: p.facts?.hasPrimaryCta ?? null,
      ogTagsPresent: p.facts?.ogTagsPresent ?? null,
      headersJson: json(p.headers),
      factsJson: p.facts
        ? json({
            headingSequence: p.facts.headingSequence,
            textSample: p.facts.textSample,
            ctaSample: p.facts.ctaSample,
            mixedContentUrls: p.facts.mixedContentUrls,
            externalScriptCount: p.facts.externalScriptCount,
            linkSample: p.facts.links.slice(0, 40).map((l) => ({ href: l.href, text: l.text, internal: l.internal })),
            imageSample: p.facts.images.slice(0, 20),
          })
        : undefined,
    })),
  });
}

async function persistChecks(auditId: string, runs: CheckRun[]) {
  await prisma.auditCheckResult.createMany({
    data: runs.map((r) => ({
      auditId,
      checkId: r.def.id,
      pillar: r.def.pillar,
      status: r.outcome.status,
      severity: r.severity,
      affectedPageCount: r.affectedPageCount,
      pageShare: r.pageShare,
      weight: r.def.weight,
      penalty: r.outcome.status === "FAIL" ? Math.round(r.def.weight * Math.min(1, r.pageShare * 2) * 100) / 100 : 0,
      evidenceJson: json({ affected: r.outcome.affected.slice(0, 10), detected: r.outcome.detected ?? null, expected: r.outcome.expected ?? r.def.expected, site: r.outcome.evidence ?? null }),
      reason: r.outcome.reason ?? null,
    })),
    skipDuplicates: true,
  });
}

async function persistFindings(auditId: string, findings: Finding[]) {
  await prisma.auditFinding.deleteMany({ where: { auditId } });
  if (!findings.length) return;
  await prisma.auditFinding.createMany({
    data: findings.map((f) => ({
      auditId,
      findingKey: f.findingKey,
      checkIdsJson: json(f.checkIds),
      pillar: f.pillar,
      section: f.section,
      severity: f.severity,
      title: f.title,
      affectedUrlsJson: json(f.affectedUrls),
      affectedPageCount: f.affectedPageCount,
      evidenceJson: json(f.evidence),
      detectedValue: f.detectedValue,
      expectedValue: f.expectedValue,
      whyItMatters: f.whyItMatters,
      recommendedFix: f.recommendedFix,
      developerDetailsJson: json(f.developerDetails),
      impact: f.impact,
      effort: f.effort,
      confidence: f.confidence,
      priorityScore: f.priorityScore,
      owner: f.owner,
      evidenceKind: f.evidenceKind,
      source: f.source,
      device: f.device,
      metric: f.metric,
    })),
  });
}

/** Plain, deterministic summary — the Phase-3 AI summary will replace this text, never the numbers. */
function buildDeterministicSummary(name: string, crawl: CrawlResult, findings: Finding[], scores: Scores): string {
  const crit = findings.filter((f) => f.severity === "CRITICAL").length;
  const high = findings.filter((f) => f.severity === "HIGH").length;
  const top = findings[0];
  const parts = [
    `We crawled ${crawl.stats.pagesCrawled} page${crawl.stats.pagesCrawled === 1 ? "" : "s"} of ${name}'s website and ran ${scores.technical.checksRun + scores.content.checksRun + scores.performance.checksRun} checks.`,
    scores.overall !== null ? `Overall SEO health is ${scores.overall}/100 (technical ${scores.technical.score ?? "—"}, content ${scores.content.score ?? "—"}, performance ${scores.performance.score ?? "not measured"}).` : "",
    findings.length ? `${findings.length} finding${findings.length === 1 ? "" : "s"} were verified — ${crit} critical, ${high} high.` : "No problems were found in the checks we ran.",
    top ? `The first thing to fix: ${top.title.toLowerCase()}.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

async function persistPerformance(auditId: string, results: PerfResult[], selected: SelectedPage[]) {
  if (!results.length) return;
  const reasonFor = new Map(selected.map((s) => [s.url, s]));
  await prisma.auditPerformance.createMany({
    data: results.map((r) => ({
      auditId,
      url: r.url,
      strategy: r.strategy,
      pageType: reasonFor.get(r.url)?.pageType ?? null,
      selectionReason: reasonFor.get(r.url)?.reason ?? null,
      status: r.status,
      error: r.error ?? null,
      errorCode: r.errorCode ?? null,
      fieldJson: json(r.field),
      labJson: r.lab ? json(r.lab) : undefined,
      diagnosticsJson: json(r.diagnostics),
      lcpElementJson: r.lcpElement ? json(r.lcpElement) : undefined,
      // Kept even when performance itself was unavailable (a NO_LCP-style metric error leaves the other categories valid).
      categoriesJson: r.categories.accessibility || r.categories.bestPractices || r.categories.seo ? json(r.categories) : undefined,
      agenticJson: r.agentic ? json(r.agentic) : undefined,
      lighthouseVersion: r.lighthouseVersion,
      analysisUtc: validDate(r.analysisUtc),
    })),
    skipDuplicates: true,
  });
}

/** A timestamp Google returned, or null — an unparsable string must not fail the insert. */
function validDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function persistAi(auditId: string, outcomes: AiPageOutcome[]) {
  if (!outcomes.length) return;
  await prisma.auditAiPageAnalysis.createMany({
    data: outcomes.map((o) => ({
      auditId,
      url: o.url,
      pageType: o.pageType,
      selectionReason: o.selectionReason,
      status: o.status,
      error: o.error ?? null,
      errorCode: o.errorCode ?? null,
      model: o.model ?? null,
      promptVersion: o.promptVersion,
      inputTokens: o.inputTokens,
      outputTokens: o.outputTokens,
      evidenceJson: o.evidence ? json(o.evidence) : undefined,
      resultJson: o.result ? json(o.result) : undefined,
      scrubbedJson: o.scrubbed.length ? json(o.scrubbed) : undefined,
    })),
    skipDuplicates: true,
  });
}
