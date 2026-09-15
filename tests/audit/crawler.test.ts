import { describe, it, expect } from "vitest";
import { crawlSite } from "@/lib/audit/core/crawler";
import { Fetcher } from "@/lib/audit/core/fetch";
import { makeFetch, testResolver, ALL_SITES, HEALTHY } from "../fixtures/sites";

const crawl = (url: string, budget = {}) => {
  const { fetchImpl, log } = makeFetch(ALL_SITES);
  return crawlSite(new Fetcher(fetchImpl, testResolver), url, { budget: { concurrency: 2, ...budget } }).then((r) => ({ r, log }));
};

describe("crawler", () => {
  it("crawls a healthy site: seeds from sitemap, follows internal links, stays on-site", async () => {
    const { r, log } = await crawl("https://healthy.test");
    const urls = r.pages.map((p) => p.url).sort();
    expect(urls).toEqual(["https://healthy.test/", "https://healthy.test/about", "https://healthy.test/blog/post-1", "https://healthy.test/contact", "https://healthy.test/services", "https://healthy.test/services/emergency"]);
    expect(r.stats.pagesCrawled).toBe(6);
    expect(r.stats.budgetHit).toBe("none");
    expect(r.robots.sitemaps).toEqual(["https://healthy.test/sitemap.xml"]);
    expect(r.sitemap.found).toBe(true);
    // never requested another site's pages
    expect(log.filter((l) => /GET https?:\/\/(?!healthy\.test|www\.healthy\.test)/.test(l))).toEqual([]);
    // probes ran
    expect(r.hostProbe.httpProbe?.finalUrl).toBe("https://healthy.test/");
    expect(r.hostProbe.altHostProbe?.finalUrl).toBe("https://healthy.test/");
    // image sample sized
    expect(r.pages.find((p) => p.url === "https://healthy.test/")?.facts?.images[0].bytes).toBe(120000);
  });

  it("marks depth and discovery source", async () => {
    const { r } = await crawl("https://healthy.test");
    const home = r.pages.find((p) => p.url === "https://healthy.test/")!;
    expect(home.depth).toBe(0);
    expect(home.discoveredVia).toBe("seed");
    expect(r.pages.find((p) => p.url === "https://healthy.test/services")!.inSitemap).toBe(true);
    expect(home.indexable).toBe(true);
    // linked pages get true click depth; the blog post is linked from the homepage → depth 1, emergency via /services → 1 (home links it? no: via services → 2)
    expect(r.pages.find((p) => p.url === "https://healthy.test/services/emergency")!.depth).toBe(2);
    expect(r.pages.find((p) => p.url === "https://healthy.test/blog/post-1")!.depth).toBe(1);
  });

  it("dedupes URL variants (trailing slash, case-sensitive paths kept distinct)", async () => {
    const { r } = await crawl("https://broken.test");
    const urls = r.pages.map((p) => p.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toContain("https://broken.test/services");
    expect(urls).toContain("https://broken.test/Services");
  });

  it("records redirects, 4xx/5xx, robots blocks and link checks on a broken site", async () => {
    const { r, log } = await crawl("https://broken.test");
    const chain = r.pages.find((p) => p.url === "https://broken.test/chain-start")!;
    expect(chain.redirectChain).toHaveLength(3);
    expect(chain.finalUrl).toBe("https://broken.test/chain-end");
    expect(r.pages.find((p) => p.url === "https://broken.test/old-page")!.statusCode).toBe(404);
    expect(r.pages.find((p) => p.url === "https://broken.test/error")!.statusCode).toBe(500);
    const blocked = r.pages.find((p) => p.url === "https://broken.test/private/secret")!;
    expect(blocked.fetchError).toBe("blocked by robots.txt");
    expect(log).not.toContain("GET https://broken.test/private/secret");
    expect(r.stats.robotsBlocked).toBe(1);
    expect(r.pages.find((p) => p.url === "https://broken.test/services")!.indexable).toBe(false); // noindex
    expect(r.hostProbe.httpProbe?.status).toBe(200); // http not redirected
    expect(r.hostProbe.altHostProbe?.finalUrl).toBe("https://www.broken.test/"); // www live too
  });

  it("respects the page budget, spends it on linked pages first, and reports it", async () => {
    const { r } = await crawl("https://healthy.test", { maxPages: 3 });
    expect(r.stats.pagesCrawled).toBe(3);
    expect(r.stats.budgetHit).toBe("pages");
    expect(r.stats.pagesSkipped).toBeGreaterThan(0);
    // homepage + two of its linked pages, not arbitrary sitemap entries
    expect(r.pages.every((p) => p.discoveredVia !== "sitemap" || p.depth !== null)).toBe(true);
  });

  it("marks sitemap-only pages with unknown depth", async () => {
    const site = { ...HEALTHY, "https://healthy.test/sitemap.xml": { headers: { "content-type": "application/xml" }, body: `<urlset><url><loc>https://healthy.test/</loc></url><url><loc>https://healthy.test/orphan</loc></url></urlset>` }, "https://healthy.test/orphan": { headers: { "content-type": "text/html" }, body: "<html><head><title>Orphan</title></head><body><p>alone</p></body></html>" } };
    const { fetchImpl } = makeFetch(site);
    const r = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://healthy.test", { budget: { concurrency: 2, politenessDelayMs: 1 } });
    expect(r.pages.find((p) => p.url === "https://healthy.test/orphan")!.depth).toBeNull();
    expect(r.pages.find((p) => p.url === "https://healthy.test/about")!.depth).toBe(1);
  });

  it("respects the time budget", async () => {
    const site = { ...HEALTHY, "https://healthy.test/services": { hang: true } };
    const { fetchImpl } = makeFetch(site);
    const r = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://healthy.test", { budget: { maxDurationMs: 300, fetchTimeoutMs: 200, concurrency: 1 } });
    expect(r.stats.durationMs).toBeLessThan(5000);
    expect(["time", "none"]).toContain(r.stats.budgetHit);
    expect(r.pages.find((p) => p.url === "https://healthy.test/services")?.fetchError).toMatch(/timed out/);
  });

  it("handles a site whose homepage is unreachable without throwing", async () => {
    const { fetchImpl } = makeFetch({});
    const r = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://nothing.test");
    expect(r.pages).toHaveLength(1);
    expect(r.pages[0].statusCode).toBe(404);
    expect(r.sitemap.found).toBe(false);
  });

  it("refuses private seeds", async () => {
    const { fetchImpl } = makeFetch({});
    const r = await crawlSite(new Fetcher(fetchImpl, testResolver), "https://internal.corp");
    expect(r.pages[0].fetchError).toMatch(/private/);
  });
});
