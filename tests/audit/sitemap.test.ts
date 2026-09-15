import { describe, it, expect } from "vitest";
import { extractLocs, discoverSitemap } from "@/lib/audit/core/sitemap";
import { Fetcher } from "@/lib/audit/core/fetch";
import { makeFetch, testResolver, HEALTHY, MALFORMED } from "../fixtures/sites";

describe("sitemap parsing", () => {
  it("extracts locs and recognises index sitemaps", () => {
    const { locs, isIndex } = extractLocs(`<sitemapindex><sitemap><loc>https://a/1.xml</loc></sitemap><sitemap><loc> https://a/2.xml </loc></sitemap></sitemapindex>`);
    expect(isIndex).toBe(true);
    expect(locs).toEqual(["https://a/1.xml", "https://a/2.xml"]);
    expect(extractLocs("<html><body>nope</body></html>").looksLikeSitemap).toBe(false);
    expect(extractLocs("<urlset><url><loc>https://a/?x=1&amp;y=2</loc></url></urlset>").locs).toEqual(["https://a/?x=1&y=2"]);
  });

  it("discovers a sitemap from robots.txt and dedupes/normalizes urls", async () => {
    const fetcher = new Fetcher(makeFetch(HEALTHY).fetchImpl, testResolver);
    const sm = await discoverSitemap(fetcher, "https://healthy.test", "healthy.test", ["https://healthy.test/sitemap.xml"]);
    expect(sm.found).toBe(true);
    expect(sm.urls).toContain("https://healthy.test/services/emergency");
    expect(sm.urls.length).toBe(6);
    expect(sm.parseErrors).toEqual([]);
  });

  it("follows a sitemap index and drops off-site urls", async () => {
    const site = {
      "https://idx.test/sitemap.xml": { headers: { "content-type": "application/xml" }, body: `<sitemapindex><sitemap><loc>https://idx.test/s1.xml</loc></sitemap><sitemap><loc>https://other.test/s.xml</loc></sitemap></sitemapindex>` },
      "https://idx.test/s1.xml": { headers: { "content-type": "application/xml" }, body: `<urlset><url><loc>https://idx.test/a</loc></url><url><loc>https://idx.test/a/</loc></url><url><loc>https://other.test/x</loc></url></urlset>` },
    };
    const fetcher = new Fetcher(makeFetch(site).fetchImpl, testResolver);
    const sm = await discoverSitemap(fetcher, "https://idx.test", "idx.test", []);
    expect(sm.found).toBe(true);
    expect(sm.sitemapCount).toBe(2);
    expect(sm.urls).toEqual(["https://idx.test/a"]);
  });

  it("reports an HTML page at /sitemap.xml as invalid rather than found", async () => {
    const fetcher = new Fetcher(makeFetch(MALFORMED).fetchImpl, testResolver);
    const sm = await discoverSitemap(fetcher, "https://malformed.test", "malformed.test", []);
    expect(sm.found).toBe(false);
    expect(sm.parseErrors[0]).toMatch(/HTML page/);
  });
});
