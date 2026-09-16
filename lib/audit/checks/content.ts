import { fail, pass, skipped, type CheckDefinition, type AffectedPage } from "./types";
import { isUtilityPath, pathOf } from "../core/url";
import type { CrawledPage } from "../core/types";

/**
 * On-page & content checks (report section C) plus the conversion-path
 * checks carried over from the v1 engine. All per-page, all evidence-backed.
 */

const GENERIC_ANCHORS = /^(click here|here|read more|learn more|more|this|link|this page|continue|go)$/i;

function groupDuplicates(pages: CrawledPage[], key: (p: CrawledPage) => string | null | undefined): AffectedPage[] {
  const map = new Map<string, CrawledPage[]>();
  for (const p of pages) {
    const k = key(p)?.trim().toLowerCase();
    if (!k) continue;
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  const out: AffectedPage[] = [];
  for (const [k, group] of map) if (group.length > 1) for (const p of group) out.push({ url: p.url, detected: k.slice(0, 120), expected: "unique per page", evidence: { sharedWith: group.filter((g) => g !== p).map((g) => g.url).slice(0, 5) } });
  return out;
}

const contentPages = (pages: CrawledPage[]) => pages.filter((p) => p.facts && !isUtilityPath(p.url));

/** A page exists if we crawled it successfully, or if the site links to it (not yet verified, e.g. crawl budget hit). */
function hasPageLike(ctx: { crawl: { pages: CrawledPage[] } ; htmlPages: CrawledPage[] }, pattern: RegExp): boolean {
  if (ctx.crawl.pages.some((p) => p.statusCode === 200 && pattern.test(pathOf(p.url)))) return true;
  if (ctx.crawl.pages.some((p) => p.fetchError?.startsWith("rate limited") && pattern.test(pathOf(p.url)))) return true;
  return ctx.htmlPages.some((p) => p.facts!.links.some((l) => l.internal && pattern.test(pathOf(l.href))));
}

const CONTENT_CHECKS: CheckDefinition[] = [
  // ---------- C1 Titles & meta ----------
  {
    id: "content.title.missing",
    pillar: "CONTENT", section: "C1", title: "Pages with no <title>",
    severity: "HIGH", weight: 15, impact: 4, effort: 1, confidence: 99,
    expected: "Every page has a unique, descriptive <title>",
    why: "The title is the blue headline in Google results and the strongest on-page ranking signal. A missing title means Google invents one.",
    fix: "Give each page a title that says what it is and where you are, e.g. '{searchKeyword} in {city} | {businessName}'.",
    developerFix: "Add `<title>…</title>` in <head>; in most CMSs this is the page's SEO title field.",
    run: (ctx) => fail(ctx.indexablePages.filter((p) => !p.facts?.title).map((p) => ({ url: p.url, detected: "no title", expected: "50–60 character descriptive title" }))),
  },
  {
    id: "content.title.duplicate",
    pillar: "CONTENT", section: "C1", title: "Duplicate page titles",
    severity: "MEDIUM", weight: 10, impact: 3, effort: 2, confidence: 98,
    expected: "Each indexable page has a different title",
    why: "When several pages share a title, Google can't tell which one to rank for a search and often shows the wrong page — or none.",
    fix: "Rewrite titles so each page's title reflects that page's specific service or topic.",
    run: (ctx) => fail(groupDuplicates(ctx.indexablePages, (p) => p.facts?.title)),
  },
  {
    id: "content.title.length",
    pillar: "CONTENT", section: "C1", title: "Titles too long or too short",
    severity: "LOW", weight: 5, impact: 2, effort: 1, confidence: 90,
    expected: "Roughly 30–60 characters",
    why: "Titles over ~60 characters get cut off in results; under ~30 usually means the title is just the brand name and wastes the space.",
    fix: "Trim long titles and expand very short ones with the service and location.",
    run: (ctx) => fail(ctx.indexablePages.filter((p) => p.facts?.title && (p.facts.title.length > 65 || p.facts.title.length < 25)).map((p) => ({ url: p.url, detected: `${p.facts!.title!.length} chars: "${p.facts!.title!.slice(0, 80)}"`, expected: "30–60 chars" }))),
  },
  {
    id: "content.meta.missing",
    pillar: "CONTENT", section: "C1", title: "Pages with no meta description",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 1, confidence: 99,
    expected: "A meta description on every indexable page",
    why: "The meta description is the grey text under your listing. Without it, Google picks a random sentence — usually a worse pitch than you'd write.",
    fix: "Write a one- or two-sentence description for each page that says what you offer and invites the click.",
    developerFix: "Add `<meta name=\"description\" content=\"…\">` per page (SEO title/description fields in the CMS).",
    run: (ctx) => fail(ctx.indexablePages.filter((p) => !p.facts?.metaDescription).map((p) => ({ url: p.url, detected: "no meta description", expected: "70–155 characters" }))),
  },
  {
    id: "content.meta.duplicate",
    pillar: "CONTENT", section: "C1", title: "Duplicate meta descriptions",
    severity: "LOW", weight: 5, impact: 2, effort: 2, confidence: 98,
    expected: "Each page has a different meta description",
    why: "Reused descriptions make every result look the same and signal templated, low-effort pages.",
    fix: "Write page-specific descriptions.",
    run: (ctx) => fail(groupDuplicates(ctx.indexablePages, (p) => p.facts?.metaDescription)),
  },
  {
    id: "content.meta.length",
    pillar: "CONTENT", section: "C1", title: "Meta descriptions too long or too short",
    severity: "LOW", weight: 3, impact: 1, effort: 1, confidence: 90,
    expected: "Roughly 70–160 characters",
    why: "Over ~160 characters gets truncated; under ~70 wastes the space you have to sell the click.",
    fix: "Adjust descriptions to one or two full sentences.",
    run: (ctx) => fail(ctx.indexablePages.filter((p) => p.facts?.metaDescription && (p.facts.metaDescription.length > 170 || p.facts.metaDescription.length < 60)).map((p) => ({ url: p.url, detected: `${p.facts!.metaDescription!.length} chars`, expected: "70–160 chars" }))),
  },
  {
    id: "content.og.missing",
    pillar: "CONTENT", section: "C1", title: "No Open Graph tags",
    severity: "LOW", weight: 3, impact: 2, effort: 1, confidence: 98,
    expected: "og:title, og:description, og:image on key pages",
    why: "Open Graph tags control how the page looks when shared on Facebook, LinkedIn, WhatsApp or iMessage. Without them shares show a blank card.",
    fix: "Add social sharing tags (most SEO plugins add these automatically).",
    developerFix: "Add `<meta property=\"og:title|og:description|og:image|og:url\">` to the head template.",
    run: (ctx) => fail(ctx.keyPages.filter((p) => p.facts && !p.facts.ogTagsPresent).map((p) => ({ url: p.url, detected: "no og: tags", expected: "og:title, og:description, og:image" }))),
  },
  // ---------- C2 Headings ----------
  {
    id: "content.h1.missing",
    pillar: "CONTENT", section: "C2", title: "Pages with no H1 heading",
    severity: "MEDIUM", weight: 10, impact: 3, effort: 1, confidence: 98,
    expected: "Exactly one H1 describing the page topic",
    why: "The H1 is the page's headline for both visitors and search engines. Without it the main topic is ambiguous.",
    fix: "Give each page one clear main heading.",
    developerFix: "Ensure the page template renders the page title as `<h1>`; page builders often use styled <div>s instead.",
    run: (ctx) => fail(contentPages(ctx.indexablePages).filter((p) => p.facts!.h1.filter((h) => h.trim()).length === 0).map((p) => ({ url: p.url, detected: "0 H1", expected: "1 H1" }))),
  },
  {
    id: "content.h1.multiple",
    pillar: "CONTENT", section: "C2", title: "Pages with multiple H1 headings",
    severity: "LOW", weight: 4, impact: 2, effort: 1, confidence: 95,
    expected: "One H1 per page",
    why: "Several H1s dilute the page's main topic; usually a theme uses H1 for the logo or section titles.",
    fix: "Keep one H1 (the page headline) and use H2/H3 for sections.",
    run: (ctx) => fail(contentPages(ctx.indexablePages).filter((p) => p.facts!.h1.length > 1).map((p) => ({ url: p.url, detected: `${p.facts!.h1.length} H1s: ${p.facts!.h1.slice(0, 3).map((h) => `"${h.slice(0, 40)}"`).join(", ")}`, expected: "1 H1" }))),
  },
  {
    id: "content.headings.skipped_levels",
    pillar: "CONTENT", section: "C2", title: "Heading levels skipped (e.g. H1 → H3)",
    severity: "LOW", weight: 3, impact: 1, effort: 2, confidence: 90,
    expected: "Headings descend one level at a time",
    why: "Skipped heading levels make the page outline harder to parse for search engines and screen readers.",
    fix: "Use H2 for main sections and H3 for sub-sections.",
    run: (ctx) => fail(contentPages(ctx.indexablePages).filter((p) => { const s = p.facts!.headingSequence; for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] > 1) return true; return false; }).map((p) => ({ url: p.url, detected: `sequence ${p.facts!.headingSequence.slice(0, 8).map((n) => `h${n}`).join(" → ")}`, expected: "no skipped levels" }))),
  },
  // ---------- C3 Content quality ----------
  {
    id: "content.thin_page",
    pillar: "CONTENT", section: "C3", title: "Thin pages (very little text)",
    severity: "MEDIUM", weight: 12, impact: 4, effort: 4, confidence: 85,
    expected: "Service and landing pages with at least ~300 words of useful text",
    why: "Pages with a heading and two sentences give search engines almost nothing to work with. Google prefers pages that fully answer what a {customer} is looking for.",
    fix: "Expand key pages: what the service is, who it's for, what happens, pricing/insurance/guarantees, FAQs, and a clear call to action.",
    run: (ctx) => fail(contentPages(ctx.indexablePages).filter((p) => p.facts!.wordCount < 300 && p.facts!.wordCount >= 0).map((p) => ({ url: p.url, detected: `${p.facts!.wordCount} words`, expected: "≥ 300 words" }))),
  },
  {
    id: "content.duplicate_body",
    pillar: "CONTENT", section: "C3", title: "Pages with identical content",
    severity: "HIGH", weight: 12, impact: 4, effort: 3, confidence: 95,
    expected: "Each indexable page has unique body content",
    why: "Two pages with the same text compete against each other and one is usually filtered out of results. Common with city pages generated from one template.",
    fix: "Rewrite duplicate pages so each covers a distinct service or location, or merge them into one page.",
    developerFix: "Either differentiate the content, canonicalise duplicates to the primary URL, or noindex the copies.",
    run: (ctx) => {
      const pages = contentPages(ctx.indexablePages).filter((p) => p.facts!.wordCount >= 50);
      const byHash = new Map<string, CrawledPage[]>();
      for (const p of pages) byHash.set(p.facts!.textHash, [...(byHash.get(p.facts!.textHash) ?? []), p]);
      const out: AffectedPage[] = [];
      for (const group of byHash.values()) if (group.length > 1) for (const p of group) out.push({ url: p.url, detected: `same text as ${group.filter((g) => g !== p).map((g) => pathOf(g.url)).slice(0, 3).join(", ")}`, expected: "unique content", evidence: { wordCount: p.facts!.wordCount } });
      return fail(out);
    },
  },
  // ---------- C4 Images ----------
  {
    id: "content.images.missing_alt",
    pillar: "CONTENT", section: "C4", title: "Images without alt text",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 2, confidence: 98,
    expected: "Every content image has descriptive alt text",
    why: "Alt text is how search engines and screen readers understand images. It also feeds Google Images, which sends real traffic for visual services.",
    fix: "Add a short description to each image (what it shows, not keywords stuffed in).",
    developerFix: "Populate the `alt` attribute for the images listed in evidence; decorative images should have `alt=\"\"`.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && p.facts.images.some((i) => i.alt === null)).map((p) => { const missing = p.facts!.images.filter((i) => i.alt === null); return { url: p.url, detected: `${missing.length} of ${p.facts!.images.length} images`, expected: "0 missing", evidence: { images: missing.slice(0, 5).map((i) => i.src) } }; })),
  },
  {
    id: "content.images.no_dimensions",
    pillar: "CONTENT", section: "C4", title: "Images without width/height",
    severity: "LOW", weight: 4, impact: 2, effort: 2, confidence: 85,
    expected: "Images declare width and height (or CSS aspect ratio)",
    why: "Without dimensions the page jumps around as images load — that's the layout-shift metric Google measures for page experience.",
    fix: "Ask your developer to set image dimensions in the template.",
    developerFix: "Add `width` and `height` attributes (or `aspect-ratio` CSS) to the <img> elements listed in evidence.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && p.facts.images.length > 0 && p.facts.images.filter((i) => !i.hasDimensions).length / p.facts.images.length > 0.5).map((p) => ({ url: p.url, detected: `${p.facts!.images.filter((i) => !i.hasDimensions).length} of ${p.facts!.images.length} images`, expected: "all sized" }))),
  },
  {
    id: "content.images.oversized",
    pillar: "CONTENT", section: "C4", title: "Very large image files",
    severity: "MEDIUM", weight: 6, impact: 3, effort: 2, confidence: 90,
    expected: "Content images under ~300 KB",
    why: "Multi-megabyte photos are the single most common reason a small-business site is slow on phones.",
    fix: "Compress and resize images before uploading (or install an image-optimisation plugin).",
    developerFix: "Serve resized WebP/AVIF variants with `srcset`; compress the files listed in evidence.",
    run: (ctx) => {
      const seen = new Set<string>();
      const affected: AffectedPage[] = [];
      for (const p of ctx.htmlPages) {
        const big = (p.facts?.images ?? []).filter((i) => (i.bytes ?? 0) > 300 * 1024 && !seen.has(i.src));
        if (!big.length) continue;
        big.forEach((i) => seen.add(i.src));
        affected.push({ url: p.url, detected: big.map((i) => `${Math.round(i.bytes! / 1024)} KB`).join(", "), expected: "< 300 KB each", evidence: { images: big.map((i) => ({ src: i.src, kb: Math.round(i.bytes! / 1024) })) } });
      }
      const probed = ctx.htmlPages.some((p) => p.facts?.images.some((i) => i.bytes != null));
      return probed ? fail(affected) : skipped("image sizes not probed");
    },
  },
  // ---------- C5 Internal linking ----------
  {
    id: "content.links.low_internal",
    pillar: "CONTENT", section: "C5", title: "Pages with very few internal links",
    severity: "LOW", weight: 5, impact: 2, effort: 2, confidence: 85,
    expected: "At least 3 internal links per content page (navigation aside)",
    why: "Internal links pass authority between pages and show search engines which pages matter. Dead-end pages get little internal support.",
    fix: "Link related services and pages to each other within the text.",
    run: (ctx) => fail(contentPages(ctx.indexablePages).filter((p) => p.facts!.links.filter((l) => l.internal).length < 3).map((p) => ({ url: p.url, detected: `${p.facts!.links.filter((l) => l.internal).length} internal links`, expected: "≥ 3" }))),
  },
  {
    id: "content.links.generic_anchor",
    pillar: "CONTENT", section: "C5", title: "Generic link text ('click here', 'read more')",
    severity: "LOW", weight: 3, impact: 1, effort: 1, confidence: 95,
    expected: "Link text describes the destination",
    why: "'Click here' tells search engines nothing about the linked page; descriptive anchors are a free relevance signal.",
    fix: "Change link text to name the destination, e.g. 'see our emergency service'.",
    run: (ctx) => fail(ctx.htmlPages.filter((p) => p.facts && p.facts.links.some((l) => l.internal && GENERIC_ANCHORS.test(l.text))).map((p) => { const g = p.facts!.links.filter((l) => l.internal && GENERIC_ANCHORS.test(l.text)); return { url: p.url, detected: `${g.length} generic anchor(s)`, expected: "descriptive anchors", evidence: { samples: g.slice(0, 3).map((l) => ({ text: l.text, href: l.href })) } }; })),
  },
  // ---------- C6 Trust & contact ----------
  {
    id: "content.trust.no_contact_page",
    pillar: "CONTENT", section: "C6", title: "No contact page found",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 1, confidence: 80, siteWide: true,
    expected: "A /contact page linked from the navigation",
    why: "A contact page is a basic trust signal for Google's quality guidelines and the page most {customers} look for before calling.",
    fix: "Add a contact page with address, phone, hours and a form, and link it in the header.",
    run: (ctx) => (hasPageLike(ctx, /contact|get-in-touch|reach-us|locations?\b|find-us|visit-us|talk-to|request-[a-z-]*(quote|estimate|appointment|consult)|book/i) ? pass() : fail([{ url: ctx.crawl.origin, detected: "no contact page crawled or linked", expected: "/contact" }])),
  },
  {
    id: "content.trust.no_about_page",
    pillar: "CONTENT", section: "C6", title: "No about page found",
    severity: "LOW", weight: 4, impact: 2, effort: 2, confidence: 75, siteWide: true,
    expected: "An about/team page",
    why: "Google's quality guidelines reward sites that show who is behind them. An about page with real people and credentials is the simplest way.",
    fix: "Add an about page introducing the team and your experience.",
    run: (ctx) => (hasPageLike(ctx, /about|our-team|\bteam\b|our-story|meet-|who-we-are|our-practice|our-company|get-to-know|know-us|company\b|our-history/i) ? pass() : fail([{ url: ctx.crawl.origin, detected: "no about page crawled or linked", expected: "/about" }])),
  },
  {
    id: "content.trust.no_privacy_page",
    pillar: "CONTENT", section: "C6", title: "No privacy policy found",
    severity: "LOW", weight: 3, impact: 1, effort: 1, confidence: 75, siteWide: true,
    expected: "A privacy policy page",
    why: "A privacy policy is legally expected when you collect form data and is a baseline trust signal.",
    fix: "Publish a privacy policy page and link it in the footer.",
    run: (ctx) => (ctx.crawl.pages.some((p) => /privacy/i.test(pathOf(p.url)) && p.statusCode === 200) || ctx.htmlPages.some((p) => p.facts?.links.some((l) => /privacy/i.test(l.href))) ? pass() : fail([{ url: ctx.crawl.origin, detected: "no privacy page linked", expected: "/privacy-policy" }])),
  },
  {
    id: "content.trust.no_nap_on_home",
    pillar: "CONTENT", section: "C6", title: "No phone number or address visible on the homepage",
    severity: "MEDIUM", weight: 8, impact: 3, effort: 1, confidence: 80, siteWide: true,
    expected: "Name, address and phone visible on the homepage (usually the footer)",
    why: "For a local {business}, a consistent name/address/phone on the site is a core local-ranking signal and the first thing a {customer} scans for.",
    fix: "Put your address and phone number in the site footer on every page.",
    run: (ctx) => {
      if (!ctx.business.hasLocation) return skipped("no physical location detected");
      if (!ctx.homepage?.facts) return skipped("no homepage");
      const f = ctx.homepage.facts;
      const missing = [!f.hasPhoneText && "phone", !f.hasAddressText && "address"].filter(Boolean) as string[];
      return missing.length ? fail([{ url: ctx.homepage.url, detected: `missing: ${missing.join(", ")}`, expected: "phone + address" }]) : pass();
    },
  },
  {
    id: "content.keyword.title_no_location",
    pillar: "CONTENT", section: "C1", title: "Homepage title doesn't mention your city",
    severity: "MEDIUM", weight: 8, impact: 4, effort: 1, confidence: 85, siteWide: true,
    expected: "Homepage title/H1 includes the city and the core service, e.g. \"{searchKeyword} in {city}\"",
    why: "People search \"{searchKeyword} {city}\". If neither your title nor your headline says where you are, you're competing without the strongest local signal.",
    fix: "Rewrite the homepage title to \"{businessName} — {searchKeyword} in {city}\" (or similar) and mention the city in the H1.",
    run: (ctx) => {
      if (!ctx.business.hasLocation || !ctx.business.city) return skipped("city unknown");
      if (!ctx.homepage?.facts) return skipped("no homepage");
      const city = ctx.business.city.toLowerCase();
      const title = (ctx.homepage.facts.title ?? "").toLowerCase();
      const h1 = ctx.homepage.facts.h1.join(" ").toLowerCase();
      if (title.includes(city) || h1.includes(city)) return pass();
      return fail([{ url: ctx.homepage.url, detected: `title: "${ctx.homepage.facts.title ?? ""}"`, expected: `mentions ${ctx.business.city}` }]);
    },
  },
  // ---------- C7 Conversion path (carried from v1) ----------
  {
    id: "content.conversion.no_tel_link",
    pillar: "CONTENT", section: "C7", title: "No tap-to-call phone link",
    severity: "MEDIUM", weight: 8, impact: 4, effort: 1, confidence: 95, siteWide: true,
    expected: "Phone number wrapped in a tel: link on the homepage",
    why: "On a phone, a plain-text number has to be copied out. A tel: link makes it one tap — that's where most local calls come from.",
    fix: "Make the phone number clickable on mobile.",
    developerFix: "Wrap the number: `<a href=\"tel:+1XXXXXXXXXX\">(XXX) XXX-XXXX</a>`.",
    run: (ctx) => (!ctx.business.hasLocation ? skipped("no physical location — phone-first conversion not assumed") : !ctx.homepage?.facts ? skipped("no homepage") : ctx.homepage.facts.hasTelLink ? pass() : fail([{ url: ctx.homepage.url, detected: ctx.homepage.facts.hasPhoneText ? "phone shown as plain text" : "no phone found", expected: "tel: link" }])),
  },
  {
    id: "content.conversion.no_primary_cta",
    pillar: "CONTENT", section: "C7", title: "No clear call-to-action on the homepage",
    severity: "MEDIUM", weight: 8, impact: 4, effort: 2, confidence: 75, siteWide: true,
    expected: "A visible button/link inviting the visitor to {booking} or contact you",
    why: "Visitors who can't see what to do next leave. A single obvious next step (call, {booking}, get a quote) is the highest-leverage conversion fix.",
    fix: "Add a prominent '{booking}' or 'Call now' button near the top of the homepage.",
    run: (ctx) => (!ctx.homepage?.facts ? skipped("no homepage") : ctx.homepage.facts.hasPrimaryCta ? pass() : fail([{ url: ctx.homepage.url, detected: "no CTA wording found in links/buttons", expected: "e.g. 'Book now', 'Get a quote'" }])),
  },
  {
    id: "content.conversion.no_form",
    pillar: "CONTENT", section: "C7", title: "No contact form found",
    severity: "LOW", weight: 5, impact: 3, effort: 2, confidence: 85, siteWide: true,
    expected: "A contact/{booking} form on the homepage or contact page",
    why: "Some {customers} won't call. A short form captures them after hours and gives you a lead you can follow up.",
    fix: "Add a short contact or {booking} form.",
    run: (ctx) => {
      if (!ctx.business.hasLocation) return skipped("no physical location — lead form not assumed");
      const candidates = ctx.htmlPages.filter((p) => p === ctx.homepage || /contact/i.test(pathOf(p.url)));
      if (!candidates.length) return skipped("no homepage");
      return candidates.some((p) => p.facts?.hasForm) ? pass() : fail([{ url: ctx.homepage?.url ?? ctx.crawl.origin, detected: "no <form> on homepage or contact page", expected: "contact form" }]);
    },
  },
];

export default CONTENT_CHECKS;
