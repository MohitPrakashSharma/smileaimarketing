import TECHNICAL_CHECKS from "./technical";
import CONTENT_CHECKS from "./content";
import type { CheckContext, CheckDefinition, CheckRun, Pillar } from "./types";
import type { CrawlResult } from "../core/types";
import type { IndustryProfile } from "@/lib/industry";
import { escalateSeverity } from "../priority";

export const ALL_CHECKS: CheckDefinition[] = [...TECHNICAL_CHECKS, ...CONTENT_CHECKS];

/** Checks that are meaningful even when no HTML page could be fetched. */
const NO_PAGE_CHECKS = new Set(["tech.reach.unreachable", "tech.reach.blocked", "tech.reach.timeouts", "tech.crawl.rate_limited", "tech.robots.missing", "tech.robots.blocks_all", "tech.sitemap.missing", "tech.sitemap.invalid", "tech.status.4xx", "tech.status.5xx", "tech.https.missing"]);

export function checksForPillar(pillar: Pillar): CheckDefinition[] {
  return ALL_CHECKS.filter((c) => c.pillar === pillar);
}

export function buildCheckContext(crawl: CrawlResult, business: { name: string; city?: string; industry: IndustryProfile }, siteHost: string): CheckContext {
  const htmlPages = crawl.pages.filter((p) => p.statusCode === 200 && p.facts && (!p.finalUrl || p.finalUrl === p.url));
  const indexablePages = htmlPages.filter((p) => p.indexable);
  const homepage = crawl.pages.find((p) => p.discoveredVia === "seed") ?? null;
  // If the seed redirected (e.g. → /home), treat the landing page as the homepage.
  const home = homepage && homepage.finalUrl && homepage.finalUrl !== homepage.url ? (crawl.pages.find((p) => p.url === homepage.finalUrl) ?? homepage) : homepage;
  const keyPages = indexablePages.filter((p) => p === home || (p.depth !== null && p.depth <= 1));
  return {
    crawl,
    siteHost,
    business: { ...business, hasLocation: Boolean(business.city) },
    htmlPages,
    indexablePages,
    homepage: home,
    keyPages,
  };
}

/**
 * Runs every check for the given pillars. A check that throws is recorded
 * as SKIPPED with the error — one broken check must never sink the audit.
 */
export function runChecks(ctx: CheckContext, pillars: Pillar[] = ["TECHNICAL", "CONTENT"]): CheckRun[] {
  const denominator = Math.max(1, ctx.indexablePages.length || ctx.htmlPages.length);
  const homeUrls = new Set([ctx.homepage?.url, ctx.homepage?.finalUrl].filter(Boolean) as string[]);
  const keyUrls = new Set(ctx.keyPages.map((p) => p.url));

  return ALL_CHECKS.filter((c) => pillars.includes(c.pillar)).map((def) => {
    let outcome;
    try {
      // A blocked crawl (bot protection / 403 on the homepage) measures nothing:
      // every check is skipped except the one that reports the block.
      if (ctx.crawl.blocked && def.id !== "tech.reach.blocked") {
        outcome = { status: "SKIPPED" as const, affected: [], reason: `site blocked automated access (${ctx.crawl.blocked.detail})` };
      } else if (ctx.htmlPages.length === 0 && !NO_PAGE_CHECKS.has(def.id)) {
        // Nothing rendered → content/site-level checks would all "fail" for lack of evidence. Skip them.
        outcome = { status: "SKIPPED" as const, affected: [], reason: "no HTML pages could be crawled" };
      } else {
        outcome = def.run(ctx);
      }
    } catch (err) {
      outcome = { status: "SKIPPED" as const, affected: [], reason: `check error: ${err instanceof Error ? err.message : String(err)}` };
    }
    const affectedPageCount = outcome.status === "FAIL" ? Math.max(outcome.affected.length, def.siteWide ? 1 : 0) : 0;
    const pageShare = outcome.status !== "FAIL" ? 0 : def.siteWide ? 1 : Math.min(1, affectedPageCount / denominator);
    const affectsHomepage = outcome.affected.some((a) => homeUrls.has(a.url));
    const affectsKeyPage = affectsHomepage || outcome.affected.some((a) => keyUrls.has(a.url));
    const severity = outcome.status === "FAIL" ? escalateSeverity(outcome.severityOverride ?? def.severity, { pageShare, affectsHomepage, affectsKeyPage, confidence: def.confidence, siteWide: def.siteWide }) : null;
    return { def, outcome, affectedPageCount, pageShare, severity, affectsHomepage, affectsKeyPage };
  });
}
