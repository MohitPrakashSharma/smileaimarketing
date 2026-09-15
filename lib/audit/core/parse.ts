import { createHash } from "node:crypto";
import { parse as parseHtml, type HTMLElement } from "node-html-parser";
import { normalizeUrl, isSameSite } from "./url";
import type { PageFacts, LinkFact, ImageFact } from "./types";

/**
 * Turns one HTML document into the structured facts the checks read.
 * Uses node-html-parser (real DOM-ish tree, tolerant of broken markup).
 * Everything here is observation only — no judgement. Judgement lives in
 * lib/audit/checks.
 */

const CTA_WORDS =
  /\b(book|schedule|appointment|request (a )?(consultation|quote|estimate|service|demo|callback)|online booking|get (a )?(quote|estimate|started)|free (quote|estimate|consultation|trial)|reserve|make a reservation|order online|enrol|enroll|sign up|contact us|call now|call us|get in touch)\b/i;

const PHONE_RE = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
const ADDRESS_RE = /\b\d{1,6}\s+[a-z0-9.'\- ]{2,40}\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|place|pl|parkway|pkwy|highway|hwy|crescent|cres|way)\b\.?/i;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", copy: "©", reg: "®", trade: "™", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“" };
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/**
 * Visible text with a space at every tag boundary, so adjacent inline
 * elements ("<a>Download font</a><h2>Interoperable</h2>") don't glue into one
 * word the way node-html-parser's `.text` does.
 */
function text(el: HTMLElement | null | undefined): string {
  if (!el) return "";
  return decodeEntities(el.innerHTML.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function attr(el: HTMLElement, name: string): string | null {
  const v = el.getAttribute(name);
  return v == null ? null : v.trim();
}

function collectSchemaTypes(node: unknown, out: string[], nodes: Array<Record<string, unknown>>): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectSchemaTypes(n, out, nodes));
    return;
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    nodes.push(o);
    const t = o["@type"];
    if (typeof t === "string") out.push(t);
    else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && out.push(x));
    if (Array.isArray(o["@graph"])) collectSchemaTypes(o["@graph"], out, nodes);
  }
}

const stripInline = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/**
 * node-html-parser is fast and tolerant but not a full HTML5 tree builder:
 * nested unclosed inline tags (`<a>…<a>…<h1>`) can swallow later siblings.
 * These regex passes over the raw markup recover links, headings and images
 * the DOM walk may have lost; results are merged (DOM first, deduped).
 */
// Attribute list that tolerates ">" inside quoted values (inline SVG data URIs, JSON in data-* attrs).
const ATTRS = String.raw`((?:[^>"']|"[^"]*"|'[^']*')*)`;

function salvageHeadings(html: string): Array<{ level: number; text: string }> {
  const out: Array<{ level: number; text: string }> = [];
  const re = new RegExp(String.raw`<h([1-6])\b${ATTRS}>([\s\S]*?)(?=<\/h\1\s*>|<h[1-6]\b|<\/(?:div|section|article|main|body|header|footer|li|td)\b|$)`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push({ level: Number(m[1]), text: stripInline(m[3]).slice(0, 200) });
  return out;
}
function salvageLinks(html: string): Array<{ href: string; text: string; rel: string | null }> {
  const out: Array<{ href: string; text: string; rel: string | null }> = [];
  const re = new RegExp(String.raw`<a\b${ATTRS}>([\s\S]*?)(?=<\/a\s*>|<a\b|<h[1-6]\b|<\/(?:li|div|p|nav|ul|body)\b|$)`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!href) continue;
    const rel = m[1].match(/\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    out.push({ href: (href[1] ?? href[2] ?? href[3] ?? "").trim(), text: stripInline(m[2]).slice(0, 120), rel: rel ? (rel[1] ?? rel[2] ?? rel[3] ?? null) : null });
  }
  return out;
}
function salvageImages(html: string): Array<{ src: string; alt: string | null; hasDimensions: boolean; loading: string | null }> {
  const out: Array<{ src: string; alt: string | null; hasDimensions: boolean; loading: string | null }> = [];
  const re = new RegExp(String.raw`<img\b${ATTRS}>`, "gi");
  let m: RegExpExecArray | null;
  const attrOf = (attrs: string, name: string) => {
    const r = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    if (r) return r[1] ?? r[2] ?? r[3] ?? "";
    // bare boolean form (`<img alt src=…>`) means alt="" — present, decorative
    return new RegExp(`(?:^|\\s)${name}(?=\\s|$)`, "i").test(attrs) ? "" : null;
  };
  while ((m = re.exec(html))) {
    const src = attrOf(m[1], "src") ?? attrOf(m[1], "data-src");
    if (!src || /^["']?data:/i.test(src)) continue;
    out.push({ src, alt: attrOf(m[1], "alt"), hasDimensions: Boolean(attrOf(m[1], "width") && attrOf(m[1], "height")) || Boolean(attrOf(m[1], "sizes")), loading: attrOf(m[1], "loading") });
  }
  return out;
}

export function parsePage(html: string, pageUrl: string, siteHost: string): PageFacts {
  // `title` as a text block: browsers treat <title> content as raw text, so an
  // unclosed <b> inside it must not be parsed as an element.
  const root = parseHtml(html, { comment: false, blockTextElements: { script: true, style: true, noscript: true, pre: true, title: true } });

  const hasDoctype = /^\s*<!doctype\s+html/i.test(html);
  const htmlEl = root.querySelector("html");
  const lang = htmlEl ? attr(htmlEl, "lang") : null;

  const charsetMeta = root.querySelector("meta[charset]");
  const httpEquiv = root.querySelector('meta[http-equiv="Content-Type"]');
  const charset = charsetMeta ? attr(charsetMeta, "charset") : httpEquiv ? (attr(httpEquiv, "content")?.match(/charset=([\w-]+)/i)?.[1] ?? null) : null;

  const titleEl = root.querySelector("head title") ?? root.querySelector("title");
  const rawTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
  const title = (titleEl ? stripInline(titleEl.text) : rawTitle ? stripInline(rawTitle) : "") || null;

  const metaDesc = root.querySelectorAll("meta").find((m) => (attr(m, "name") ?? "").toLowerCase() === "description");
  const metaDescription = metaDesc ? attr(metaDesc, "content") || null : null;

  const canonicalEl = root.querySelectorAll("link").find((l) => (attr(l, "rel") ?? "").toLowerCase().split(/\s+/).includes("canonical"));
  const canonical = canonicalEl ? normalizeUrl(attr(canonicalEl, "href") ?? "", pageUrl) : null;

  const robotsEl = root.querySelectorAll("meta").find((m) => ["robots", "googlebot"].includes((attr(m, "name") ?? "").toLowerCase()));
  const robotsMeta = robotsEl ? (attr(robotsEl, "content") ?? "").toLowerCase() || null : null;

  const viewport = root.querySelectorAll("meta").some((m) => (attr(m, "name") ?? "").toLowerCase() === "viewport");

  const headingSequence: number[] = [];
  const headingCounts: Record<string, number> = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const h1: string[] = [];
  const domHeadings = root.querySelectorAll("h1, h2, h3, h4, h5, h6").map((el) => ({ level: Number(el.tagName.slice(1)), text: text(el) }));
  const rawHeadings = salvageHeadings(html);
  // The DOM walk loses headings on badly nested markup; the raw scan never sees fewer.
  const headings = rawHeadings.length > domHeadings.length ? rawHeadings : domHeadings;
  const headingList = headings.slice(0, 60).map((h) => ({ level: h.level, text: h.text.slice(0, 160) }));
  for (const { level, text: t } of headings) {
    headingSequence.push(level);
    headingCounts[`h${level}`] = (headingCounts[`h${level}`] ?? 0) + 1;
    if (level === 1) h1.push(t);
  }

  // Structured data first — a malformed <head> can land <script> tags in the
  // body, and the visible-text pass below removes scripts.
  const schemaTypes: string[] = [];
  const schemaNodes: Array<Record<string, unknown>> = [];
  let schemaErrors = 0;
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      collectSchemaTypes(JSON.parse(s.text.trim()), schemaTypes, schemaNodes);
    } catch {
      schemaErrors++;
    }
  }
  if (root.querySelector("[itemscope]")) schemaTypes.push(...root.querySelectorAll("[itemtype]").map((e) => (attr(e, "itemtype") ?? "").split("/").pop() ?? "").filter(Boolean));

  // Visible text: strip script/style/noscript/template, then nav/footer are kept
  // (they're visible) but we measure the main content separately when present.
  const bodyEl = root.querySelector("body") ?? root;
  for (const el of bodyEl.querySelectorAll("script, style, noscript, template, svg")) el.remove();
  const fullBodyTextEarly = text(bodyEl);
  // Main content = the largest main/article/[role=main] container; page builders
  // often use <article> for "related posts" cards, so the first match is not
  // enough. Fall back to the body when no container holds a real share of the text.
  const containers = bodyEl.querySelectorAll("main, article, [role=main]").map((el) => text(el));
  const biggest = containers.reduce((best, t) => (t.length > best.length ? t : best), "");
  const mainText = (biggest.length >= fullBodyTextEarly.length * 0.3 ? biggest : fullBodyTextEarly).replace(/^\s*<!doctype[^>]*>\s*/i, "");
  const wordCount = mainText ? mainText.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0;
  const normalizedText = mainText.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  const textHash = createHash("sha1").update(normalizedText).digest("hex");
  const fullBodyText = text(bodyEl);
  const bodyWordCount = fullBodyText ? fullBodyText.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0;
  // Client-rendered apps ship an empty mount point: <div id="root"></div>, <div id="__next"></div>, <div id="app"></div>.
  const mount = bodyEl.querySelector("#root, #__next, #app, #___gatsby, [data-reactroot]");
  const spaRootEmpty = Boolean(mount) && text(mount).length < 20 && bodyWordCount < 40;
  // "Soft 404": a 200 page whose title/heading says it's an error and that has little else on it.
  const errorWords = /\b(404|page not found|not found|page doesn't exist|no longer available|error)\b/i;
  const looksLikeErrorPage = bodyWordCount < 200 && (errorWords.test(title ?? "") || errorWords.test(h1.join(" ")));

  const links: LinkFact[] = [];
  const seenLinks = new Set<string>();
  let hasTelLink = false;
  const rawAnchors = [
    ...root.querySelectorAll("a[href]").map((a) => ({ href: attr(a, "href") ?? "", text: text(a), rel: attr(a, "rel") })),
    ...salvageLinks(html),
  ];
  for (const a of rawAnchors) {
    const href = a.href;
    if (/^tel:/i.test(href)) {
      hasTelLink = true;
      continue;
    }
    if (/^(mailto:|javascript:|#|sms:|whatsapp:)/i.test(href) || href === "") continue;
    // Unrendered template placeholders ("{{item.url}}", "itemDataObject.url") are not links.
    if (/[{}$]|%7B|^[\w-]+(\.[\w-]+)*\.(url|href|link|src)$/i.test(href)) continue;
    const abs = normalizeUrl(href, pageUrl);
    if (!abs || seenLinks.has(abs)) continue;
    seenLinks.add(abs);
    links.push({
      href: abs,
      text: a.text.slice(0, 120),
      rel: a.rel,
      internal: isSameSite(abs, siteHost),
      nofollow: (a.rel ?? "").toLowerCase().split(/\s+/).includes("nofollow"),
    });
  }

  const images: ImageFact[] = [];
  const seenImages = new Set<string>();
  const rawImages = [
    ...root.querySelectorAll("img").map((img) => ({
      src: attr(img, "src") ?? attr(img, "data-src") ?? "",
      alt: img.getAttribute("alt") == null ? null : (img.getAttribute("alt") ?? "").trim(),
      hasDimensions: Boolean(attr(img, "width") && attr(img, "height")) || /\b(width|height)\s*:/i.test(attr(img, "style") ?? "") || Boolean(attr(img, "sizes")),
      loading: attr(img, "loading"),
    })),
    ...salvageImages(html),
  ];
  for (const img of rawImages) {
    if (!img.src || /^data:/i.test(img.src)) continue;
    const abs = normalizeUrl(img.src, pageUrl) ?? img.src;
    if (seenImages.has(abs)) continue;
    seenImages.add(abs);
    images.push({ src: abs, alt: img.alt, hasDimensions: img.hasDimensions, loading: img.loading });
  }

  const hasForm = Boolean(root.querySelector("form"));
  const ctaCandidates = root.querySelectorAll("a, button, input[type=submit]");
  let ctaSample: string | null = null;
  const hasPrimaryCta = ctaCandidates.some((el) => {
    const t = text(el) || attr(el, "value") || attr(el, "aria-label") || "";
    if (CTA_WORDS.test(t)) {
      ctaSample = ctaSample ?? t.slice(0, 60);
      return true;
    }
    return false;
  });

  const ogTagsPresent = root.querySelectorAll("meta").some((m) => (attr(m, "property") ?? "").toLowerCase().startsWith("og:"));

  const mixed = new Set<string>();
  if (pageUrl.startsWith("https://")) {
    for (const el of root.querySelectorAll("script[src], img[src], iframe[src], link[href], source[src], video[src], audio[src]")) {
      const v = attr(el, "src") ?? attr(el, "href") ?? "";
      if (/^http:\/\//i.test(v)) {
        if (el.tagName === "LINK" && !/stylesheet|icon|preload/i.test(attr(el, "rel") ?? "")) continue;
        mixed.add(v);
      }
    }
  }

  let scriptBytesEstimate = 0;
  let externalScriptCount = 0;
  for (const s of parseHtml(html).querySelectorAll("script")) {
    if (attr(s, "src")) externalScriptCount++;
    else scriptBytesEstimate += s.text.length;
  }
  scriptBytesEstimate += externalScriptCount * 50_000;

  return {
    hasDoctype,
    lang,
    charset,
    title,
    metaDescription,
    canonical,
    robotsMeta,
    viewport,
    h1,
    headingCounts,
    headingSequence,
    headings: headingList,
    wordCount,
    textHash,
    textSample: mainText.slice(0, 300),
    mainText: mainText.slice(0, 15_000),
    links,
    images,
    schemaTypes: [...new Set(schemaTypes)],
    schemaErrors,
    schemaNodes,
    hasTelLink,
    hasForm,
    hasPrimaryCta,
    ctaSample,
    ogTagsPresent,
    mixedContentUrls: [...mixed].slice(0, 20),
    scriptBytesEstimate,
    externalScriptCount,
    hasPhoneText: hasTelLink || PHONE_RE.test(fullBodyText),
    hasAddressText: ADDRESS_RE.test(fullBodyText) || schemaNodes.some((n) => Boolean(n.address)) || Boolean(root.querySelector("address")),
    bodyWordCount,
    spaRootEmpty,
    looksLikeErrorPage,
  };
}
