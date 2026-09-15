import type { CheckContext, CheckRun } from "../checks/types";
import type { CrawledPage } from "../core/types";
import { pathOf } from "../core/url";
import type { PageType } from "../pages/select";
import { inboundLinkCounts } from "../pages/select";

/**
 * Builds the compact, normalized evidence packet for one page. This is the
 * ONLY thing the model sees: no raw HTML, no scripts, no nav/footer
 * boilerplate, no secrets. It is also what we persist (evidenceJson) so an
 * analysis can be reproduced or audited later.
 */

export interface PageEvidence {
  business: { name: string; industry: string; customersNoun: string; city: string | null };
  page: {
    url: string;
    path: string;
    pageType: PageType;
    selectionReason: string;
    title: string | null;
    metaDescription: string | null;
    canonical: "self" | "other" | "none";
    h1: string[];
    headings: Array<{ level: number; text: string }>;
    wordCount: number;
    contentWordsSent: number;
    contentTruncated: boolean;
    content: string;
    internalLinksOut: Array<{ text: string; path: string; redirectsTo?: string }>;
    inboundInternalLinks: number;
    schemaTypes: string[];
    cta: { hasPrimaryCta: boolean; sample: string | null; hasTelLink: boolean; hasForm: boolean };
    contactSignals: { phoneOnPage: boolean; addressOnPage: boolean };
    faq: { present: boolean; questions: string[] };
    siteTrust: { aboutPage: boolean; contactPage: boolean; privacyPage: boolean };
    duplicateOf: string[];
    deterministicIssues: Array<{ checkId: string; title: string; detected: string | null }>;
  };
}

const MAX_WORDS = 1800;
const HEAD_WORDS = 1300;
const TAIL_WORDS = 300;

/**
 * Boilerplate = runs of words that recur across pages (navigation, footers,
 * cookie notices, CTAs). Detected with 8-word shingles so unpunctuated nav
 * strips ("Skip to content Home Services About Contact") are caught as well
 * as repeated sentences. Built once per crawl; a shingle present on ≥ 40% of
 * pages (min 3; on tiny sites, 2) marks its words for removal.
 */
const SHINGLE = 8;

export function buildBoilerplateSet(pages: CrawledPage[]): Set<string> {
  const withText = pages.filter((p) => p.facts?.mainText);
  if (withText.length < 2) return new Set();
  const counts = new Map<string, number>();
  for (const p of withText) {
    const seen = new Set<string>();
    for (const sh of shingles(words(p.facts!.mainText))) {
      if (seen.has(sh)) continue;
      seen.add(sh);
      counts.set(sh, (counts.get(sh) ?? 0) + 1);
    }
  }
  const threshold = withText.length < 5 ? 2 : Math.max(3, Math.ceil(withText.length * 0.4));
  return new Set([...counts.entries()].filter(([, n]) => n >= threshold).map(([s]) => s));
}

export function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function shingles(ws: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + SHINGLE <= ws.length; i++) out.push(ws.slice(i, i + SHINGLE).join(" ").toLowerCase());
  return out;
}

/** Kept for tests / callers that want sentence segmentation. */
export function segments(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\s{2,}|\s[|•·]\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function cleanContent(text: string, boilerplate: Set<string>): { content: string; wordsSent: number; truncated: boolean } {
  const ws = words(text);
  const drop = new Array<boolean>(ws.length).fill(false);
  if (boilerplate.size) {
    for (let i = 0; i + SHINGLE <= ws.length; i++) {
      if (boilerplate.has(ws.slice(i, i + SHINGLE).join(" ").toLowerCase())) for (let j = i; j < i + SHINGLE; j++) drop[j] = true;
    }
  }
  const kept = ws.filter((_, i) => !drop[i]);
  if (kept.length <= MAX_WORDS) return { content: kept.join(" "), wordsSent: kept.length, truncated: false };
  const content = `${kept.slice(0, HEAD_WORDS).join(" ")} […] ${kept.slice(-TAIL_WORDS).join(" ")}`;
  return { content, wordsSent: HEAD_WORDS + TAIL_WORDS, truncated: true };
}

function detectFaq(page: CrawledPage): { present: boolean; questions: string[] } {
  const f = page.facts!;
  const schemaFaq = f.schemaTypes.some((t) => /faqpage/i.test(t));
  const questions = f.headings.filter((h) => /\?\s*$/.test(h.text) && h.text.length > 12).map((h) => h.text.slice(0, 160)).slice(0, 8);
  const faqHeading = f.headings.some((h) => /\bfaqs?\b|frequently asked/i.test(h.text));
  return { present: schemaFaq || questions.length >= 2 || faqHeading, questions };
}

export function buildPageEvidence(page: CrawledPage, pageType: PageType, selectionReason: string, ctx: CheckContext, runs: CheckRun[], boilerplate: Set<string>): PageEvidence {
  const f = page.facts!;
  const inbound = inboundLinkCounts(ctx).get(page.url) ?? 0;
  const cleaned = cleanContent(f.mainText, boilerplate);
  const issues = runs
    .filter((r) => r.outcome.status === "FAIL" && !r.def.siteWide && r.def.pillar !== "PERFORMANCE")
    .flatMap((r) => r.outcome.affected.filter((a) => a.url === page.url).map((a) => ({ checkId: r.def.id, title: r.def.title, detected: a.detected ?? null })))
    .slice(0, 12);
  const dupes = ctx.htmlPages.filter((p) => p !== page && p.facts?.textHash === f.textHash && f.wordCount >= 50).map((p) => pathOf(p.url)).slice(0, 5);
  const hasPage = (re: RegExp) => ctx.crawl.pages.some((p) => p.statusCode === 200 && re.test(pathOf(p.url))) || ctx.htmlPages.some((p) => p.facts!.links.some((l) => l.internal && re.test(pathOf(l.href))));

  return {
    // Online-only businesses (software, agencies) have no service area — don't invite location advice.
    business: { name: ctx.business.name, industry: ctx.business.industry.label, customersNoun: ctx.business.industry.customers, city: ["software", "agency"].includes(ctx.business.industry.key) ? null : (ctx.business.city ?? null) },
    page: {
      url: page.url,
      path: pathOf(page.url),
      pageType,
      selectionReason,
      title: f.title,
      metaDescription: f.metaDescription,
      canonical: !f.canonical ? "none" : f.canonical === (page.finalUrl ?? page.url) ? "self" : "other",
      h1: f.h1.slice(0, 3),
      headings: f.headings.filter((h) => h.level >= 2 && h.level <= 3).slice(0, 40),
      wordCount: f.wordCount,
      contentWordsSent: cleaned.wordsSent,
      contentTruncated: cleaned.truncated,
      content: cleaned.content,
      internalLinksOut: f.links
        .filter((l) => l.internal && l.href !== page.url)
        .slice(0, 12)
        .map((l) => {
          const target = ctx.crawl.pages.find((p) => p.url === l.href);
          const redirectsTo = target?.finalUrl && target.finalUrl !== target.url ? pathOf(target.finalUrl) : undefined;
          return { text: l.text.slice(0, 60), path: pathOf(l.href), ...(redirectsTo ? { redirectsTo } : {}) };
        }),
      inboundInternalLinks: inbound,
      schemaTypes: f.schemaTypes.slice(0, 10),
      cta: { hasPrimaryCta: f.hasPrimaryCta, sample: f.ctaSample, hasTelLink: f.hasTelLink, hasForm: f.hasForm },
      contactSignals: { phoneOnPage: f.hasPhoneText, addressOnPage: f.hasAddressText },
      faq: detectFaq(page),
      siteTrust: { aboutPage: hasPage(/about|our-team|team|get-to-know|who-we-are/i), contactPage: hasPage(/contact|get-in-touch|book|appointment|quote|estimate/i), privacyPage: hasPage(/privacy/i) },
      duplicateOf: dupes,
      deterministicIssues: issues,
    },
  };
}

/** Rough token estimate (≈ 4 chars/token) for cost accounting. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
