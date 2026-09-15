import type { FetchImpl, Resolver } from "@/lib/audit/core/fetch";

/**
 * In-memory fixture websites. Each site is a map of absolute URL → response.
 * `makeFetch` turns the union of sites into a FetchImpl for the Fetcher, so
 * crawler + checks run fully offline and deterministically.
 */

export interface FixtureResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
  /** simulate a hang → the fetcher's timeout fires */
  hang?: boolean;
}

export type FixtureSite = Record<string, FixtureResponse>;

const html = (opts: { title?: string | null; desc?: string | null; h1?: string[] | null; body?: string; head?: string; canonical?: string | null; robots?: string; viewport?: boolean; lang?: string | null; doctype?: boolean; charset?: boolean; links?: string[]; images?: Array<{ src: string; alt?: string | null; dims?: boolean }>; tel?: boolean; form?: boolean; cta?: boolean; og?: boolean; ldjson?: string | null; footer?: string }) => {
  const {
    title = "Page", desc = "A description of this page that is long enough to be useful to a searcher.", h1 = ["Heading"], body = "", head = "", canonical, robots, viewport = true, lang = "en", doctype = true, charset = true, links = [], images = [], tel = false, form = false, cta = false, og = false, ldjson = null, footer = "",
  } = opts;
  return `${doctype ? "<!DOCTYPE html>" : ""}<html${lang ? ` lang="${lang}"` : ""}><head>${charset ? '<meta charset="utf-8">' : ""}${viewport ? '<meta name="viewport" content="width=device-width, initial-scale=1">' : ""}${title !== null ? `<title>${title}</title>` : ""}${desc !== null ? `<meta name="description" content="${desc}">` : ""}${canonical ? `<link rel="canonical" href="${canonical}">` : ""}${robots ? `<meta name="robots" content="${robots}">` : ""}${og ? '<meta property="og:title" content="x"><meta property="og:image" content="https://x/y.png">' : ""}${ldjson ? `<script type="application/ld+json">${ldjson}</script>` : ""}${head}</head><body><nav>${links.map((l) => `<a href="${l}">${l.replace(/^\//, "") || "home"} page</a>`).join("")}</nav><main>${(h1 ?? []).map((h) => `<h1>${h}</h1>`).join("")}${body}${images.map((i) => `<img src="${i.src}"${i.alt === null ? "" : ` alt="${i.alt ?? "photo"}"`}${i.dims === false ? "" : ' width="400" height="300"'}>`).join("")}${cta ? '<a href="/contact" class="btn">Book now</a>' : ""}${form ? '<form action="/contact"><input name="email"><button type="submit">Send</button></form>' : ""}</main><footer>${tel ? '<a href="tel:+14165550100">(416) 555-0100</a>' : ""}${footer}</footer></body></html>`;
};

const words = (n: number, seed = "service") => Array.from({ length: n }, (_, i) => `${seed}${i % 17} text`).join(" ");
const paragraphs = (n: number, seed?: string) => `<h2>About</h2><p>${words(n, seed)}</p>`;

const H = { "content-type": "text/html; charset=utf-8", "strict-transport-security": "max-age=31536000", "x-content-type-options": "nosniff", "x-frame-options": "SAMEORIGIN" };

// ---------------------------------------------------------------- healthy
const healthyPages = ["/", "/services", "/services/emergency", "/about", "/contact", "/blog/post-1"];
export const HEALTHY: FixtureSite = {
  "https://healthy.test/robots.txt": { headers: { "content-type": "text/plain" }, body: "User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://healthy.test/sitemap.xml\n" },
  "https://healthy.test/sitemap.xml": { headers: { "content-type": "application/xml" }, body: `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${healthyPages.map((p) => `<url><loc>https://healthy.test${p}</loc></url>`).join("")}</urlset>` },
  "https://healthy.test/": { headers: H, body: html({ title: "Bright Plumbing — Plumber in Toronto | 24/7 Service", desc: "Licensed Toronto plumbers for emergency repairs, drains and water heaters. Same-day service across the GTA.", h1: ["Plumber in Toronto you can call at 3am"], body: paragraphs(400, "home"), canonical: "https://healthy.test/", links: ["/services", "/about", "/contact", "/blog/post-1"], images: [{ src: "/img/van.jpg", alt: "Bright Plumbing service van" }], tel: true, form: true, cta: true, og: true, ldjson: JSON.stringify({ "@context": "https://schema.org", "@type": "Plumber", name: "Bright Plumbing", telephone: "+14165550100", address: { "@type": "PostalAddress", streetAddress: "1 Main St", addressLocality: "Toronto", addressRegion: "ON" } }), footer: "1 Main Street, Toronto, ON M5V 1A1" }) },
  "https://healthy.test/services": { headers: H, body: html({ title: "Plumbing Services in Toronto | Bright Plumbing", desc: "Drain cleaning, leak repair, water heaters and more — every plumbing service a Toronto home needs, done right.", h1: ["Our plumbing services"], body: paragraphs(350, "svc"), canonical: "https://healthy.test/services", links: ["/", "/services/emergency", "/contact", "/about"], images: [{ src: "/img/drain.jpg", alt: "Drain cleaning" }], cta: true, og: true }) },
  "https://healthy.test/services/emergency": { headers: H, body: html({ title: "Emergency Plumber Toronto — 24/7 | Bright Plumbing", desc: "Burst pipe? Flooded basement? Our emergency plumbers reach anywhere in Toronto within the hour, day or night.", h1: ["Emergency plumbing, 24/7"], body: paragraphs(330, "emerg"), canonical: "https://healthy.test/services/emergency", links: ["/", "/services", "/contact"], cta: true, og: true }) },
  "https://healthy.test/about": { headers: H, body: html({ title: "About Bright Plumbing | Toronto's Family Plumbers", desc: "Meet the licensed team behind Bright Plumbing — 20 years serving Toronto homeowners with honest, upfront pricing.", h1: ["About us"], body: paragraphs(320, "about"), canonical: "https://healthy.test/about", links: ["/", "/services", "/contact"], og: true }) },
  "https://healthy.test/contact": { headers: H, body: html({ title: "Contact Bright Plumbing | Toronto", desc: "Call, text or book online. Bright Plumbing serves all of Toronto and the GTA with same-day appointments.", h1: ["Contact us"], body: paragraphs(120, "contact"), canonical: "https://healthy.test/contact", links: ["/", "/services"], tel: true, form: true, og: true, footer: "1 Main Street, Toronto, ON M5V 1A1" }) },
  "https://healthy.test/blog/post-1": { headers: H, body: html({ title: "How to unclog a drain without damaging pipes | Bright Plumbing", desc: "A plumber's guide to safely clearing a slow drain at home, and when to stop and call a professional instead.", h1: ["How to unclog a drain"], body: paragraphs(600, "blog"), canonical: "https://healthy.test/blog/post-1", links: ["/", "/services", "/services/emergency"], og: true }) },
  "https://healthy.test/img/van.jpg": { headers: { "content-type": "image/jpeg", "content-length": "120000" }, body: "" },
  "https://healthy.test/img/drain.jpg": { headers: { "content-type": "image/jpeg", "content-length": "90000" }, body: "" },
  "http://healthy.test/": { status: 301, headers: { location: "https://healthy.test/" } },
  "https://www.healthy.test/": { status: 301, headers: { location: "https://healthy.test/" } },
};

// ---------------------------------------------------------------- broken
export const BROKEN: FixtureSite = {
  "https://broken.test/robots.txt": { headers: { "content-type": "text/plain" }, body: "User-agent: *\nDisallow: /private/\n" },
  "https://broken.test/sitemap.xml": { status: 404, headers: { "content-type": "text/html" }, body: "<html><body>404</body></html>" },
  "https://broken.test/": { headers: { "content-type": "text/html" }, body: html({ title: "Home", desc: null, h1: ["Welcome", "Welcome again"], body: paragraphs(320, "home"), viewport: false, lang: null, links: ["/services", "/old-page", "/private/secret", "/chain-start", "/error", "/Services", "/about", "/contact"], images: [{ src: "http://broken.test/img/big.jpg", alt: null, dims: false }], tel: false, cta: false, form: false, ldjson: "{ not valid json" }) },
  "https://broken.test/services": { headers: { "content-type": "text/html" }, body: html({ title: "Home", desc: null, h1: [], body: paragraphs(320, "svc"), robots: "noindex,nofollow", canonical: "https://broken.test/", viewport: false, lang: null, links: ["/"] }) },
  "https://broken.test/Services": { headers: { "content-type": "text/html" }, body: html({ title: "Home", h1: ["Services"], body: paragraphs(320, "svc"), viewport: false, lang: null, links: ["/"] }) },
  "https://broken.test/about": { headers: { "content-type": "text/html" }, body: html({ title: "About", h1: ["About"], body: paragraphs(320, "about"), viewport: false, lang: null, links: ["/"] }) },
  "https://broken.test/contact": { headers: { "content-type": "text/html" }, body: html({ title: "Contact", h1: ["Contact"], body: paragraphs(100, "contact"), viewport: false, lang: null, links: ["/"] }) },
  "https://broken.test/old-page": { status: 404, headers: { "content-type": "text/html" }, body: "<html><body>Not found</body></html>" },
  "https://broken.test/error": { status: 500, headers: { "content-type": "text/html" }, body: "<html><body>Oops</body></html>" },
  "https://broken.test/chain-start": { status: 301, headers: { location: "/chain-middle" } },
  "https://broken.test/chain-middle": { status: 302, headers: { location: "/chain-end" } },
  "https://broken.test/chain-end": { headers: { "content-type": "text/html" }, body: html({ title: "Chain end", h1: ["Chain end"], body: paragraphs(320, "chain"), viewport: false, lang: null, links: ["/"] }) },
  "https://broken.test/img/big.jpg": { headers: { "content-type": "image/jpeg", "content-length": "2500000" }, body: "" },
  "http://broken.test/img/big.jpg": { headers: { "content-type": "image/jpeg", "content-length": "2500000" }, body: "" },
  "http://broken.test/": { headers: { "content-type": "text/html" }, body: html({ title: "Home", h1: ["Welcome"], body: paragraphs(320, "home"), viewport: false, lang: null }) },
  "https://www.broken.test/": { headers: { "content-type": "text/html" }, body: html({ title: "Home", h1: ["Welcome"], body: paragraphs(320, "home"), viewport: false, lang: null }) },
};

// ---------------------------------------------------------------- thin
export const THIN: FixtureSite = {
  "https://thin.test/robots.txt": { status: 404, headers: { "content-type": "text/plain" }, body: "" },
  "https://thin.test/sitemap.xml": { status: 404, headers: { "content-type": "text/plain" }, body: "" },
  "https://thin.test/": { headers: H, body: html({ title: "Thin Co", desc: null, h1: [], body: "<p>We do things.</p>", links: ["/services", "/pricing", "/contact"], canonical: "https://thin.test/" }) },
  "https://thin.test/services": { headers: H, body: html({ title: "Services", desc: null, h1: [], body: "<p>Services list.</p>", links: ["/"], canonical: "https://thin.test/services" }) },
  "https://thin.test/pricing": { headers: H, body: html({ title: "Pricing", desc: null, h1: [], body: "<p>Call for pricing.</p>", links: ["/"], canonical: "https://thin.test/pricing" }) },
  "https://thin.test/contact": { headers: H, body: html({ title: "Contact", desc: null, h1: ["Contact"], body: "<p>Email us.</p>", links: ["/"], canonical: "https://thin.test/contact" }) },
  "http://thin.test/": { status: 301, headers: { location: "https://thin.test/" } },
  "https://www.thin.test/": { status: 301, headers: { location: "https://thin.test/" } },
};

// ---------------------------------------------------------------- duplicate
const cityBody = paragraphs(400, "dup");
export const DUPLICATE: FixtureSite = {
  "https://dup.test/robots.txt": { headers: { "content-type": "text/plain" }, body: "User-agent: *\nAllow: /\nSitemap: https://dup.test/sitemap.xml\n" },
  "https://dup.test/sitemap.xml": { headers: { "content-type": "application/xml" }, body: `<urlset><url><loc>https://dup.test/</loc></url><url><loc>https://dup.test/toronto</loc></url><url><loc>https://dup.test/mississauga</loc></url><url><loc>https://dup.test/brampton</loc></url><url><loc>https://dup.test/gone</loc></url></urlset>` },
  "https://dup.test/": { headers: H, body: html({ title: "Roofing Company", desc: "Roofing company description that is definitely long enough to pass the length check here.", h1: ["Roofing"], body: paragraphs(400, "home"), links: ["/toronto", "/mississauga", "/brampton", "/about", "/contact"], canonical: "https://dup.test/", tel: true, cta: true, form: true }) },
  "https://dup.test/toronto": { headers: H, body: html({ title: "Roofing Company", desc: "Roofing company description that is definitely long enough to pass the length check here.", h1: ["Roofing"], body: cityBody, links: ["/"], canonical: "https://dup.test/toronto" }) },
  "https://dup.test/mississauga": { headers: H, body: html({ title: "Roofing Company", desc: "Roofing company description that is definitely long enough to pass the length check here.", h1: ["Roofing"], body: cityBody, links: ["/"], canonical: "https://dup.test/mississauga" }) },
  "https://dup.test/brampton": { headers: H, body: html({ title: "Roofing Company", desc: "Roofing company description that is definitely long enough to pass the length check here.", h1: ["Roofing"], body: cityBody, links: ["/"], canonical: "https://dup.test/brampton" }) },
  "https://dup.test/about": { headers: H, body: html({ title: "About the roofing company", desc: "About page description that is definitely long enough to pass the length check here ok.", h1: ["About"], body: paragraphs(320, "about"), links: ["/"], canonical: "https://dup.test/about" }) },
  "https://dup.test/contact": { headers: H, body: html({ title: "Contact the roofing company", desc: "Contact page description that is definitely long enough to pass the length check here ok.", h1: ["Contact"], body: paragraphs(100, "contact"), links: ["/"], canonical: "https://dup.test/contact", tel: true, form: true }) },
  "https://dup.test/gone": { status: 410, headers: { "content-type": "text/html" }, body: "<html><body>gone</body></html>" },
  "http://dup.test/": { status: 301, headers: { location: "https://dup.test/" } },
  "https://www.dup.test/": { status: 301, headers: { location: "https://dup.test/" } },
};

// ---------------------------------------------------------------- malformed
export const MALFORMED: FixtureSite = {
  "https://malformed.test/robots.txt": { headers: { "content-type": "text/html" }, body: "<html><body>This is not robots</body></html>" },
  "https://malformed.test/sitemap.xml": { headers: { "content-type": "text/html" }, body: "<html><body>Not a sitemap</body></html>" },
  "https://malformed.test/": { headers: { "content-type": "text/html" }, body: `<html><head><title>Malformed <b>Site</title><meta name=description content="unquoted attrs everywhere and this description is long enough to count"><script type="application/ld+json">{"@type": "LocalBusiness", "name": "X",}</script></head><body><div><p>Unclosed paragraph <span>and span <a href="/page-2">link<a href="/page-3">another<h1>Heading<h3>Skipped level</h3><img src="/a.png"><img src="/b.png" alt=""><p>${words(350, "mal")}` },
  "https://malformed.test/page-2": { headers: { "content-type": "text/html" }, body: `<html><body><h1>Two</h1><p>${words(320, "two")}<a href="/">home</a>` },
  "https://malformed.test/page-3": { headers: { "content-type": "text/html" }, body: `<html><body><h1>Three</h1><p>${words(320, "three")}<a href="/">home</a><a href="/page-2">two</a>` },
  "https://malformed.test/a.png": { headers: { "content-type": "image/png", "content-length": "1000" }, body: "" },
  "https://malformed.test/b.png": { headers: { "content-type": "image/png", "content-length": "1000" }, body: "" },
  "http://malformed.test/": { status: 301, headers: { location: "https://malformed.test/" } },
  "https://www.malformed.test/": { status: 301, headers: { location: "https://malformed.test/" } },
};

export const ALL_SITES: FixtureSite = { ...HEALTHY, ...BROKEN, ...THIN, ...DUPLICATE, ...MALFORMED };

/** Fetch stub. Unknown URLs → 404. Records every request for assertions. */
export function makeFetch(site: FixtureSite = ALL_SITES, log: string[] = []): { fetchImpl: FetchImpl; log: string[] } {
  const fetchImpl: FetchImpl = async (url, init) => {
    log.push(`${init.method} ${url}`);
    const entry = site[url] ?? site[url.replace(/\/$/, "")] ?? site[`${url}/`];
    if (!entry) return new Response("<html><body>Not found</body></html>", { status: 404, headers: { "content-type": "text/html" } });
    if (entry.hang) {
      return new Promise((_, reject) => {
        init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      });
    }
    const body = init.method === "HEAD" ? null : (entry.body ?? "");
    return new Response(body, { status: entry.status ?? 200, headers: entry.headers ?? {} });
  };
  return { fetchImpl, log };
}

/** DNS stub: every *.test host is a public address; special names simulate private resolution. */
export const testResolver: Resolver = async (host) => {
  if (host === "internal.corp") return ["10.0.0.5"];
  if (host === "evil.test") return ["93.184.216.34", "169.254.169.254"];
  if (host === "v6local.test") return ["fe80::1"];
  if (host === "nxdomain.test") throw new Error("ENOTFOUND");
  return ["93.184.216.34"];
};
