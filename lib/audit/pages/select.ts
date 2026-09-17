import type { CrawledPage } from "../core/types";
import type { CheckContext, CheckRun } from "../checks/types";
import { pathOf, isUtilityPath } from "../core/url";

/**
 * Deterministic page classification and representative-page selection.
 * Used by the PageSpeed stage (which URLs to test) and the AI stage (which
 * pages are worth an OpenAI call). Every selection carries a reason so the
 * stored rows explain themselves.
 */

export type PageType = "home" | "service" | "location" | "conversion" | "content" | "about" | "legal" | "utility" | "other";

export interface SelectedPage {
  url: string;
  page: CrawledPage;
  pageType: PageType;
  reason: string;
}

const CONTENT_RE = /\/(blog|news|articles?|posts?|resources?|guides?|insights|tips|faq|faqs|learn|knowledge|stories|case-stud(y|ies))(\/|$)|\/20\d\d\/\d\d\//i;
const LOCATION_RE = /\/(locations?|service-areas?|areas?-we-serve|areas?-served|cities|near-me|our-offices?|branches)(\/|$)/i;
const CONVERSION_RE = /(^|\/)(contact|contact-us|get-in-touch|book|booking|book-online|book-now|appointment|appointments|schedule|request-[a-z-]+|[a-z-]*(quote|estimate|consultation)[a-z-]*|get-started|sign-?up)(\/|$|\?)/i;
const ABOUT_RE = /\/(about|about-us|our-team|team|our-story|meet-|who-we-are|our-practice|our-company|get-to-know|know-us|our-history)(\/|$|-)/i;
// Legal / policy pages are never representative of the practice (and never "service" pages): any path segment starting with privacy, terms, cookie(s), legal, disclaimer, accessibility, gdpr, refund, conditions.
const LEGAL_RE = /\/(privacy[a-z0-9-]*|terms[a-z0-9-]*|conditions[a-z0-9-]*|cookies?[a-z0-9-]*|legal[a-z0-9-]*|disclaimers?|accessibility[a-z0-9-]*|gdpr|refund[a-z0-9-]*|returns?-policy|sitemap)(\/|$)/i;
const SERVICE_RE = /\/(services?|treatments?|procedures?|solutions?|products?|repairs?|installation|what-we-do|our-services|specialties|practice-areas|menu|programs?|classes|pricing|plans|features?|enterprise|platform)(\/|$)/i;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// CMS artefacts that are never worth testing or analysing: media attachment pages, author/tag/category archives, pagination, header/footer templates.
const ARTEFACT_RE = /\/(attachment|author|tag|tags|category|categories|page\/\d+|feed|elementor-hf|wp-content|comments?)(\/|$)/i;

/**
 * How convincingly a page is a service/offer page: 2 = path or industry
 * vocabulary says so, 1 = only "top-level page with some text" (fallback),
 * 0 = not a service page. Selection prefers strength before link popularity,
 * so a heavily-linked utility page (a font page in every footer) never
 * outranks a real service page.
 */
export function serviceStrength(page: CrawledPage, ctx: CheckContext): 0 | 1 | 2 {
  const path = pathOf(page.url);
  const title = (page.facts?.title ?? "").toLowerCase();
  if (SERVICE_RE.test(path)) return 2;
  if (ctx.business.industry.matchers.some((m) => `${path.toLowerCase()} ${title}`.includes(m.trim()))) return 2;
  return classifyPage(page, ctx) === "service" ? 1 : 0;
}

export function classifyPage(page: CrawledPage, ctx: CheckContext): PageType {
  if (page === ctx.homepage || page.url === ctx.homepage?.url || page.url === ctx.homepage?.finalUrl) return "home";
  const path = pathOf(page.url);
  const title = (page.facts?.title ?? "").toLowerCase();
  if (ARTEFACT_RE.test(path)) return "utility";
  if (LEGAL_RE.test(path)) return "legal";
  if (CONVERSION_RE.test(path)) return "conversion";
  if (ABOUT_RE.test(path)) return "about";
  if (LOCATION_RE.test(path)) return "location";
  const city = ctx.business.city ? slug(ctx.business.city) : null;
  // A short path segment built around the business's own city ("/toronto", "/plumber-toronto", "/toronto-west") is a location page.
  if (city && city.length > 3) {
    const segs = path.toLowerCase().split("/").filter(Boolean);
    if (segs.some((seg) => seg === city || ((seg.startsWith(`${city}-`) || seg.endsWith(`-${city}`)) && seg.split("-").length <= 3))) return "location";
  }
  if (CONTENT_RE.test(path)) return "content";
  if (isUtilityPath(page.url)) return "utility";
  if (SERVICE_RE.test(path)) return "service";
  const matchers = ctx.business.industry.matchers;
  const haystack = `${path.toLowerCase()} ${title}`;
  if (matchers.some((m) => haystack.includes(m.trim()))) return "service";
  if ((page.facts?.wordCount ?? 0) >= 800 && (page.depth ?? 9) >= 2) return "content";
  if ((page.depth ?? 9) <= 1 && (page.facts?.wordCount ?? 0) >= 250) return "service";
  return "other";
}

/** How many crawled pages link to each URL — a cheap importance signal. */
export function inboundLinkCounts(ctx: CheckContext): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of ctx.htmlPages) {
    const seen = new Set<string>();
    for (const l of p.facts?.links ?? []) {
      if (!l.internal || seen.has(l.href) || l.href === p.url) continue;
      seen.add(l.href);
      counts.set(l.href, (counts.get(l.href) ?? 0) + 1);
    }
  }
  return counts;
}

export interface SelectionOptions {
  max: number;
  /** Failing check ids per URL — pages with many issues are worth AI attention. */
  issuesByUrl?: Map<string, string[]>;
  /** Include pages whose only claim is "has many issues" (AI stage). */
  includeIssuePages?: boolean;
}

/**
 * Picks representative pages in slot order: home → best service → location →
 * conversion → content → (more services) → (issue-heavy pages). Pages with
 * identical body text (same textHash) are skipped so we never test/analyse two copies.
 */
export function selectRepresentativePages(ctx: CheckContext, opts: SelectionOptions): SelectedPage[] {
  const inbound = inboundLinkCounts(ctx);
  const candidates = ctx.htmlPages.filter((p) => p.facts && p.indexable !== false);
  const typed = candidates.map((p) => ({ p, type: classifyPage(p, ctx) }));
  const importance = (p: CrawledPage) => (inbound.get(p.url) ?? 0) * 10 + Math.min(20, Math.floor((p.facts?.wordCount ?? 0) / 100)) - (p.depth ?? 5) * 3;

  const chosen: SelectedPage[] = [];
  const usedHashes = new Set<string>();
  // Dedupe on body content only: two pages sharing a title is a finding
  // (content.title.duplicate), not a reason to skip either of them.
  const add = (p: CrawledPage, type: PageType, reason: string) => {
    if (chosen.length >= opts.max) return false;
    if (chosen.some((c) => c.url === p.url)) return false;
    const hash = p.facts?.textHash;
    if (hash && usedHashes.has(hash)) return false;
    if (hash) usedHashes.add(hash);
    chosen.push({ url: p.url, page: p, pageType: type, reason });
    return true;
  };
  const rank = (a: CrawledPage, b: CrawledPage, type: PageType) => (type === "service" ? serviceStrength(b, ctx) - serviceStrength(a, ctx) || importance(b) - importance(a) : importance(b) - importance(a));
  const best = (type: PageType, exclude: Set<string> = new Set()) =>
    typed
      .filter((t) => t.type === type && !exclude.has(t.p.url))
      .sort((a, b) => rank(a.p, b.p, type))[0]?.p;

  if (ctx.homepage?.facts) add(ctx.homepage, "home", "homepage");
  const s1 = best("service");
  if (s1) add(s1, "service", `most-linked service page (${inbound.get(s1.url) ?? 0} internal links)`);
  const loc = best("location");
  if (loc) add(loc, "location", "location / service-area page");
  const conv = best("conversion");
  if (conv) add(conv, "conversion", "conversion page (contact / booking / quote)");
  const content = typed.filter((t) => t.type === "content").sort((a, b) => (b.p.facts?.wordCount ?? 0) - (a.p.facts?.wordCount ?? 0))[0]?.p;
  if (content) add(content, "content", `longest content page (${content.facts?.wordCount ?? 0} words)`);

  // Fill remaining slots with further service pages, then issue-heavy pages.
  const taken = new Set(chosen.map((c) => c.url));
  for (const t of typed.filter((t) => t.type === "service" && !taken.has(t.p.url)).sort((a, b) => rank(a.p, b.p, "service"))) {
    if (chosen.length >= opts.max) break;
    if (add(t.p, "service", `service page (${inbound.get(t.p.url) ?? 0} internal links)`)) taken.add(t.p.url);
  }
  if (opts.includeIssuePages && opts.issuesByUrl) {
    const issueRanked = typed
      .filter((t) => !taken.has(t.p.url) && t.type !== "legal" && t.type !== "utility" && (opts.issuesByUrl!.get(t.p.url)?.length ?? 0) >= 3)
      .sort((a, b) => (opts.issuesByUrl!.get(b.p.url)?.length ?? 0) - (opts.issuesByUrl!.get(a.p.url)?.length ?? 0));
    for (const t of issueRanked) {
      if (chosen.length >= opts.max) break;
      if (add(t.p, t.type, `${opts.issuesByUrl.get(t.p.url)!.length} deterministic issues on this page`)) taken.add(t.p.url);
    }
  }
  // Last resort on tiny sites: any remaining important non-utility page.
  for (const t of typed.filter((t) => !taken.has(t.p.url) && !["legal", "utility"].includes(t.type)).sort((a, b) => importance(b.p) - importance(a.p))) {
    if (chosen.length >= opts.max) break;
    if (add(t.p, t.type, `next most-linked page (${t.type})`)) taken.add(t.p.url);
  }
  return chosen;
}

/** Failing check ids per URL, from the Phase-1 check runs. */
export function issuesByUrl(runs: CheckRun[]): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const r of runs) {
    if (r.outcome.status !== "FAIL" || r.def.siteWide) continue;
    for (const a of r.outcome.affected) m.set(a.url, [...(m.get(a.url) ?? []), r.def.id]);
  }
  return m;
}
