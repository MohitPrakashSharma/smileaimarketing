import type { CheckRun, Pillar, Severity } from "../checks/types";
import type { CheckContext } from "../checks/types";
import { maxSeverity, priorityScore, compareFindings } from "../priority";
import { shortUrl, isUtilityPath } from "../core/url";
import { performanceDenominator } from "../checks";
import { classifyPage } from "../pages/select";
import type { IndustryProfile } from "@/lib/industry";
import { cap } from "@/lib/industry";

/**
 * Rolls atomic check results into the findings a business owner reads.
 *
 *  - Family groups: related checks → one finding ("Page titles and
 *    descriptions need work"). Severity = worst member; effort = the
 *    heaviest member; confidence = the least certain member.
 *  - Page groups: a key page with ≥3 failing content checks becomes its own
 *    finding ("Service page optimization is incomplete: /services") so the
 *    owner sees one actionable item per important page.
 *  - A failing check that belongs to no family becomes a finding by itself.
 *
 * Scores are computed from check results, not findings, so overlapping
 * groups never double-penalise. Every finding keeps `checkIds` and
 * `developerDetails` so the underlying evidence is one click away.
 */

export type EvidenceKind = "MEASURED" | "DETERMINISTIC_FINDING" | "AI_RECOMMENDATION" | "AI_INFERRED_OPPORTUNITY" | "UNKNOWN";

export interface DeveloperDetail {
  checkId: string;
  title: string;
  severity: Severity;
  /** field = real-user CrUX, lab = Lighthouse simulation, diagnostic = Lighthouse audit, crawler = our crawl */
  dataSource: "crawler" | "field" | "lab" | "diagnostic" | "ai";
  device: "mobile" | "desktop" | null;
  affectedPageCount: number;
  detected: string | null;
  expected: string;
  fix: string;
  developerFix: string | null;
  urls: Array<{ url: string; detected?: string; expected?: string; evidence?: Record<string, unknown> }>;
}

export interface Finding {
  findingKey: string;
  checkIds: string[];
  pillar: Pillar;
  section: string;
  severity: Severity;
  title: string;
  affectedUrls: string[];
  affectedPageCount: number;
  evidence: Record<string, unknown>;
  detectedValue: string | null;
  expectedValue: string | null;
  whyItMatters: string;
  recommendedFix: string;
  developerDetails: DeveloperDetail[];
  impact: number;
  effort: number;
  confidence: number;
  priorityScore: number;
  owner: "owner" | "developer" | "agency";
  /** Provenance — measured/deterministic for everything built here; AI findings are built in lib/audit/ai. */
  evidenceKind: EvidenceKind;
  source: "crawler" | "pagespeed" | "openai";
  device: "mobile" | "desktop" | null;
  metric: string | null;
}

interface GroupDef {
  key: string;
  title: string;
  pillar: Pillar;
  section: string;
  checkIds: string[];
  why: string;
  fixIntro: string;
  owner: Finding["owner"];
}

const GROUPS: GroupDef[] = [
  { key: "unreachable", title: "Your website could not be loaded", pillar: "TECHNICAL", section: "B1", checkIds: ["tech.reach.unreachable"], why: "Nothing else in this report can help until the site loads. Every {customer} and every search engine is hitting the same wall.", fixIntro: "Restore the site first, then re-run this audit.", owner: "developer" },
  { key: "https_security", title: "Site security & HTTPS setup is incomplete", pillar: "TECHNICAL", section: "B5", checkIds: ["tech.https.missing", "tech.https.no_redirect", "tech.https.mixed_content", "tech.security.hsts_missing", "tech.security.headers", "tech.host.www_inconsistent"], why: "Browsers warn {customers} away from insecure pages, Google prefers secure sites, and a site reachable at several addresses splits its ranking signals.", fixIntro: "Serve one secure version of the site and redirect everything else to it.", owner: "developer" },
  { key: "indexability", title: "Search engines may be blocked from, or confused about, your pages", pillar: "TECHNICAL", section: "B1", checkIds: ["tech.robots.blocks_all", "tech.robots.blocks_important", "tech.index.noindex_important", "tech.index.canonical_mismatch", "tech.index.canonical_non_https", "tech.index.canonical_missing", "tech.duplicate.url_variants"], why: "These settings decide whether Google is allowed to show a page at all. A single wrong tag can remove a page from search regardless of how good it is.", fixIntro: "Make every important page crawlable, indexable and canonical to itself.", owner: "developer" },
  { key: "sitemap_robots", title: "Sitemap and robots.txt need attention", pillar: "TECHNICAL", section: "B1", checkIds: ["tech.robots.missing", "tech.sitemap.missing", "tech.sitemap.invalid", "tech.sitemap.stale_urls"], why: "The sitemap and robots.txt are how you hand search engines a clean map of your site. Missing or broken, they slow down discovery of every page you add.", fixIntro: "Publish a valid sitemap of live, indexable URLs and point robots.txt at it.", owner: "developer" },
  { key: "broken_pages_links", title: "Broken pages, links and redirects", pillar: "TECHNICAL", section: "B1", checkIds: ["tech.status.4xx", "tech.status.5xx", "tech.links.broken_internal", "tech.links.broken_external", "tech.redirect.chain", "tech.redirect.internal_links_redirect"], why: "A dead link stops a visitor and wastes crawl budget; redirect chains add delay on every hop.", fixIntro: "Fix or redirect the broken URLs and point links at final destinations.", owner: "developer" },
  { key: "site_structure", title: "Site structure makes some pages hard to reach", pillar: "TECHNICAL", section: "B2", checkIds: ["tech.arch.depth_gt3", "tech.arch.orphan_in_sitemap", "tech.url.hygiene"], why: "Pages that are buried or barely linked look unimportant to search engines and get crawled less often.", fixIntro: "Bring important pages within three clicks of the homepage and keep URLs clean.", owner: "agency" },
  { key: "performance", title: "Server response is slow", pillar: "TECHNICAL", section: "B3", checkIds: ["tech.perf.ttfb_slow", "perf.diag.server_response"], why: "The server takes a long time to start sending the page, so everything else waits. Google treats server response as part of its page-experience measurements.", fixIntro: "Enable page caching or move to faster hosting.", owner: "developer" },
  // ---------- Phase 2A performance (PageSpeed) ----------
  { key: "perf_mobile_load", title: "Mobile page load performance is poor", pillar: "PERFORMANCE", section: "P1", checkIds: ["perf.mobile.lab.score_poor", "perf.mobile.lab.score_needs_improvement", "perf.mobile.lab.fcp_slow", "perf.mobile.lab.speed_index_slow"], why: "Google measures the mobile loading experience directly and uses it as a page-experience signal, and a slow first load is the first thing a visitor on a phone notices.", fixIntro: "Treat mobile speed as one project: the findings below list the specific culprits in order of savings.", owner: "developer" },
  { key: "perf_lcp", title: "Large hero media is delaying the page's main content", pillar: "PERFORMANCE", section: "P1", checkIds: ["perf.mobile.field.lcp_poor", "perf.mobile.field.lcp_needs_improvement", "perf.mobile.lab.lcp_poor", "perf.mobile.lab.lcp_needs_improvement", "perf.desktop.field.lcp_poor", "perf.diag.lcp_resource"], why: "Largest Contentful Paint is the moment the page 'looks loaded'. When the hero image or headline is heavy, lazy-loaded or queued behind scripts, every visitor stares at a half-built page.", fixIntro: "Make the first big image load first and load lighter.", owner: "developer" },
  { key: "perf_js_main_thread", title: "JavaScript is blocking the main thread", pillar: "PERFORMANCE", section: "P2", checkIds: ["perf.mobile.field.inp_poor", "perf.mobile.field.inp_needs_improvement", "perf.mobile.lab.tbt_high", "perf.mobile.lab.tbt_moderate", "perf.diag.render_blocking", "perf.diag.unused_js", "perf.diag.unused_css", "perf.diag.main_thread", "perf.diag.dom_size"], why: "Scripts that run before the page is usable keep a phone busy — taps are ignored, menus lag, and Google's INP metric records it. Unused code and render-blocking files are the usual cause.", fixIntro: "Load less JavaScript up front and defer the rest.", owner: "developer" },
  { key: "perf_layout_shift", title: "The page layout shifts while loading", pillar: "PERFORMANCE", section: "P1", checkIds: ["perf.mobile.field.cls_poor", "perf.mobile.field.cls_needs_improvement", "perf.mobile.lab.cls_poor", "perf.mobile.lab.cls_needs_improvement"], why: "Content jumping around as images, fonts and embeds arrive makes {customers} tap the wrong thing — and Google measures it as Cumulative Layout Shift.", fixIntro: "Reserve space for everything that loads late.", owner: "developer" },
  { key: "perf_caching", title: "Static assets are not cached or compressed effectively", pillar: "PERFORMANCE", section: "P2", checkIds: ["perf.diag.caching", "perf.diag.compression", "perf.diag.payload"], why: "Files that could be compressed or kept in the browser are re-downloaded in full on every visit. These are server settings — cheap to fix, felt on every page.", fixIntro: "Enable compression and long-lived caching at the server or CDN.", owner: "developer" },
  { key: "perf_third_party", title: "Third-party scripts are adding significant execution cost", pillar: "PERFORMANCE", section: "P2", checkIds: ["perf.diag.third_party"], why: "Chat widgets, tag managers, pixels and embeds run on every page and you don't control their code. Each one taxes every visitor's phone.", fixIntro: "Remove what you don't use; load the rest after the page is interactive.", owner: "owner" },
  { key: "perf_desktop", title: "Desktop performance needs improvement", pillar: "PERFORMANCE", section: "P1", checkIds: ["perf.desktop.lab.score_poor", "perf.desktop.lab.score_needs_improvement"], why: "Slow on a laptop with a fast connection means the page itself is heavy, not the network.", fixIntro: "The mobile fixes above apply here too.", owner: "developer" },
  { key: "mobile_html", title: "Mobile and HTML basics are missing", pillar: "TECHNICAL", section: "B4", checkIds: ["tech.mobile.viewport_missing", "tech.html.lang_missing", "tech.html.basics"], why: "Google assesses the mobile version of a page first, so mobile basics affect how every page is evaluated.", fixIntro: "Add the standard viewport, language and charset declarations to the site template.", owner: "developer" },
  { key: "js_rendering", title: "Page content depends on JavaScript to appear", pillar: "TECHNICAL", section: "B4", checkIds: ["tech.render.js_only"], why: "When the HTML arrives empty and JavaScript fills it in later, search engines see less — sometimes nothing — and previews on social/messaging apps are blank.", fixIntro: "Server-render or pre-render the main content.", owner: "developer" },
  { key: "structured_data", title: "Structured data is missing or invalid", pillar: "TECHNICAL", section: "B6", checkIds: ["tech.schema.none", "tech.schema.invalid_json", "tech.schema.missing_localbusiness"], why: "Structured data is how you tell Google exactly what the {business} is, where it is and when it's open — and how you qualify for rich results.", fixIntro: "Add valid LocalBusiness/Organization JSON-LD to the homepage.", owner: "developer" },
  { key: "titles_descriptions", title: "Page titles and descriptions need work", pillar: "CONTENT", section: "C1", checkIds: ["content.title.missing", "content.title.duplicate", "content.title.length", "content.meta.missing", "content.meta.duplicate", "content.meta.length", "content.og.missing", "content.keyword.title_no_location"], why: "Titles and descriptions are your listing in Google. They decide both whether you rank for \"{searchKeyword} {city}\" and whether someone clicks you rather than the {business} above or below.", fixIntro: "Write a unique title and description for every page that names the service and the location.", owner: "owner" },
  { key: "headings", title: "Heading structure is weak", pillar: "CONTENT", section: "C2", checkIds: ["content.h1.missing", "content.h1.multiple", "content.headings.skipped_levels"], why: "Headings are the outline search engines use to understand each page. Missing or muddled headings blur what the page is about.", fixIntro: "One clear H1 per page, then H2/H3 for sections.", owner: "owner" },
  { key: "thin_duplicate_content", title: "Thin or duplicated page content", pillar: "CONTENT", section: "C3", checkIds: ["content.thin_page", "content.duplicate_body"], why: "Pages with little or copied text give search engines very little to work with. Google favours pages that fully answer what a {customer} is looking for, in their own words.", fixIntro: "Expand thin pages and make duplicated pages genuinely different (or merge them).", owner: "owner" },
  { key: "images_alt", title: "Images are missing alt text", pillar: "CONTENT", section: "C4", checkIds: ["content.images.missing_alt"], why: "Alt text is how search engines and screen readers know what an image shows. Images without it are invisible to both.", fixIntro: "Describe each meaningful image in its alt text.", owner: "owner" },
  { key: "images_size", title: "Images have no set size or are too large", pillar: "CONTENT", section: "C4", checkIds: ["content.images.no_dimensions", "content.images.oversized"], why: "Images without width and height make the page jump as they load; oversized files make every page slower to download.", fixIntro: "Set width and height on images and compress large photos.", owner: "owner" },
  { key: "internal_linking", title: "Internal linking could work harder", pillar: "CONTENT", section: "C5", checkIds: ["content.links.low_internal", "content.links.generic_anchor"], why: "Links between your own pages tell search engines which pages matter and what they're about. Dead-end pages and 'click here' links waste that.", fixIntro: "Link related pages to each other with descriptive link text.", owner: "owner" },
  { key: "trust_signals", title: "Trust and contact signals are incomplete", pillar: "CONTENT", section: "C6", checkIds: ["content.trust.no_contact_page", "content.trust.no_about_page", "content.trust.no_privacy_page", "content.trust.no_nap_on_home"], why: "Google's quality guidelines look for who is behind a site and how to reach them. A visitor needs the same information to get in touch.", fixIntro: "Make sure the site has clear about, contact and privacy pages and shows your address and phone.", owner: "owner" },
  { key: "conversion_path", title: "It's hard for a visitor to take the next step", pillar: "CONTENT", section: "C7", checkIds: ["content.conversion.no_tel_link", "content.conversion.no_primary_cta", "content.conversion.no_form"], why: "Ranking only pays off if the visitor can act. Without a tap-to-call number, a visible '{booking}' button or a short form, a visitor who is ready to book has to hunt for a way to reach you}.", fixIntro: "Put a clickable phone number, one clear call-to-action and a short form where visitors can see them.", owner: "owner" },
];

const MAX_PAGE_FINDINGS = 5;
const PAGE_GROUP_CHECKS = new Set(["content.title.missing", "content.title.length", "content.meta.missing", "content.h1.missing", "content.h1.multiple", "content.thin_page", "content.images.missing_alt", "content.links.low_internal", "tech.schema.none", "content.og.missing"]);

export function fillTemplate(t: string, ind: IndustryProfile, extra: { city?: string; businessName?: string; host?: string } = {}): string {
  return t
    .replace(/\{cap_customers\}/g, cap(ind.customers))
    .replace(/\{customers\}/g, ind.customers)
    .replace(/\{customer\}/g, ind.customer)
    .replace(/\{businesses\}/g, ind.businesses)
    .replace(/\{business\}/g, ind.business)
    .replace(/\{booking\}/g, ind.booking)
    .replace(/\{searchKeyword\}/g, ind.searchKeyword)
    .replace(/\{city\}/g, extra.city ?? "your city")
    .replace(/\{businessName\}/g, extra.businessName ?? "your business")
    .replace(/\{host\}/g, extra.host ?? "example.com");
}

function detailFor(run: CheckRun, fill: (t: string) => string): DeveloperDetail {
  return {
    checkId: run.def.id,
    title: run.def.title,
    severity: run.severity ?? run.def.severity,
    dataSource: run.def.evidenceType ?? "crawler",
    device: run.def.device ?? null,
    affectedPageCount: run.affectedPageCount,
    detected: run.outcome.detected ?? (run.outcome.affected.length === 1 ? run.outcome.affected[0].detected ?? null : run.outcome.affected.length ? `${run.outcome.affected.length} page(s)` : null),
    expected: fill(run.def.expected),
    fix: fill(run.def.fix),
    developerFix: run.def.developerFix ? fill(run.def.developerFix) : null,
    urls: run.outcome.affected.slice(0, 25),
  };
}

function assemble(key: string, title: string, pillar: Pillar, section: string, why: string, fixIntro: string, owner: Finding["owner"], members: CheckRun[], denominator: number, fill: (t: string) => string): Finding {
  const urls = new Set<string>();
  for (const m of members) for (const a of m.outcome.affected) urls.add(a.url);
  const severity = maxSeverity(members.map((m) => m.severity)) ?? "LOW";
  const impact = Math.max(...members.map((m) => m.def.impact));
  const effort = Math.max(...members.map((m) => m.def.effort));
  const confidence = Math.min(...members.map((m) => m.def.confidence));
  const pageShare = members.some((m) => m.def.siteWide) ? 1 : Math.min(1, urls.size / denominator);
  const affectsHomepage = members.some((m) => m.affectsHomepage);
  const details = members.sort((a, b) => (b.severity ? 1 : 0) - (a.severity ? 1 : 0)).map((m) => detailFor(m, fill));
  const lead = details[0];
  const fixLines = [fill(fixIntro), ...details.map((d) => `• ${d.fix}`)];
  const devices = new Set(members.map((m) => m.def.device).filter(Boolean));
  const source: Finding["source"] = members.every((m) => m.def.pillar === "PERFORMANCE") ? "pagespeed" : "crawler";
  return {
    findingKey: key,
    checkIds: members.map((m) => m.def.id),
    pillar,
    section,
    severity,
    title: fill(title),
    affectedUrls: [...urls].slice(0, 50),
    affectedPageCount: urls.size || (members.some((m) => m.def.siteWide) ? 1 : 0),
    evidence: Object.fromEntries(members.map((m) => [m.def.id, { status: m.outcome.status, affected: m.outcome.affected.slice(0, 10), ...(m.outcome.evidence ? { site: m.outcome.evidence } : {}) }])),
    detectedValue: details.length === 1 ? lead.detected : details.map((d) => `${d.title}: ${d.detected ?? d.affectedPageCount + " page(s)"}`).join("; ").slice(0, 500),
    expectedValue: details.length === 1 ? lead.expected : null,
    whyItMatters: fill(why),
    recommendedFix: fixLines.join("\n"),
    developerDetails: details,
    impact,
    effort,
    confidence,
    priorityScore: priorityScore({ severity, impact, effort, confidence, pageShare, affectsHomepage }),
    owner,
    evidenceKind: source === "pagespeed" ? "MEASURED" : "DETERMINISTIC_FINDING",
    source,
    device: devices.size === 1 ? ([...devices][0] as "mobile" | "desktop") : null,
    metric: members.length === 1 ? (members[0].def.metric ?? null) : null,
  };
}

export function buildFindings(runs: CheckRun[], ctx: CheckContext): Finding[] {
  const fill = (t: string) => fillTemplate(t, ctx.business.industry, { city: ctx.business.city, businessName: ctx.business.name, host: ctx.siteHost });
  const failing = runs.filter((r) => r.outcome.status === "FAIL");
  const byId = new Map(failing.map((r) => [r.def.id, r]));
  const denominator = Math.max(1, ctx.indexablePages.length || ctx.htmlPages.length);
  // PageSpeed measured only the representative pages: a finding built purely from
  // performance checks is judged against those, not the whole crawl — otherwise
  // "poor on 4 of 4 tested pages" would rank like "poor on 4 of 40".
  const perfDenominator = performanceDenominator(ctx);
  const denominatorFor = (members: CheckRun[]) => (members.every((m) => m.def.scope === "performance") ? perfDenominator : denominator);
  const findings: Finding[] = [];
  const grouped = new Set<string>();

  for (const g of GROUPS) {
    const members = g.checkIds.map((id) => byId.get(id)).filter((r): r is CheckRun => Boolean(r));
    if (!members.length) continue;
    members.forEach((m) => grouped.add(m.def.id));
    findings.push(assemble(g.key, g.title, g.pillar, g.section, g.why, g.fixIntro, g.owner, members, denominatorFor(members), fill));
  }

  // Ungrouped failing checks become findings on their own.
  for (const r of failing) {
    if (grouped.has(r.def.id)) continue;
    findings.push(assemble(r.def.id, r.def.title, r.def.pillar, r.def.section, r.def.why, r.def.fix, "developer", [r], denominatorFor([r]), fill));
  }

  // Per-page roll-ups for important pages with several content problems —
  // capped so a flat 40-page site doesn't produce 40 near-identical findings.
  const pageFindings: Finding[] = [];
  for (const page of ctx.keyPages) {
    if (isUtilityPath(page.url)) continue;
    // Legal / policy pages are linked from every footer (so they sit at depth 1) but are not
    // "main pages" a practice should rework for search — their issues stay in the site-wide groups.
    if (classifyPage(page, ctx) === "legal") continue;
    const members = failing.filter((r) => PAGE_GROUP_CHECKS.has(r.def.id) && r.outcome.affected.some((a) => a.url === page.url));
    if (members.length < 3) continue;
    const isHome = page === ctx.homepage;
    const label = isHome ? "Homepage" : `Page ${shortUrl(page.url)}`;
    const scoped = members.map<CheckRun>((m) => ({ ...m, outcome: { ...m.outcome, affected: m.outcome.affected.filter((a) => a.url === page.url) }, affectedPageCount: 1, pageShare: 1 / denominator }));
    const f = assemble(
      `page:${new URL(page.url).pathname}`,
      `${label} optimization is incomplete`,
      "CONTENT",
      "C3",
      isHome ? "The homepage is the page most {customers} and search engines see first. Several basics are missing at once, which compounds: weak title, weak headline, little text." : "This is one of your main pages, and several on-page basics are missing at once. Fixing them together is usually a single afternoon of work and gives search engines a much clearer picture of the page.",
      `Rework this page as one job: title, description, headline, body text and images together.`,
      "owner",
      scoped,
      denominator,
      fill
    );
    f.affectedUrls = [page.url];
    f.affectedPageCount = 1;
    f.priorityScore = priorityScore({ severity: f.severity, impact: f.impact, effort: Math.min(3, f.effort), confidence: f.confidence, pageShare: 1 / denominator, affectsHomepage: isHome });
    pageFindings.push(f);
  }
  pageFindings.sort((a, b) => (a.findingKey === "page:/" ? -1 : b.findingKey === "page:/" ? 1 : b.priorityScore - a.priorityScore));
  findings.push(...pageFindings.slice(0, MAX_PAGE_FINDINGS));

  return findings.sort(compareFindings);
}
