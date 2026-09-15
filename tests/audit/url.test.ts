import { describe, it, expect } from "vitest";
import { normalizeUrl, isSameSite, isCrawlableUrl, alternateHost, isUtilityPath, ensureScheme } from "@/lib/audit/core/url";

describe("normalizeUrl", () => {
  it("lowercases host, strips fragment, default port and tracking params", () => {
    expect(normalizeUrl("HTTPS://Example.COM:443/Path?utm_source=x&b=2&a=1#frag")).toBe("https://example.com/Path?a=1&b=2");
  });
  it("collapses index files, duplicate slashes and trailing slash on non-root", () => {
    expect(normalizeUrl("https://example.com//about//index.html")).toBe("https://example.com/about");
    expect(normalizeUrl("https://example.com/about/")).toBe("https://example.com/about");
    expect(normalizeUrl("https://example.com")).toBe("https://example.com/");
  });
  it("resolves relative URLs against a base", () => {
    expect(normalizeUrl("../contact", "https://example.com/services/emergency")).toBe("https://example.com/contact");
    expect(normalizeUrl("?page=2", "https://example.com/blog")).toBe("https://example.com/blog?page=2");
  });
  it("rejects non-http schemes and garbage", () => {
    expect(normalizeUrl("mailto:a@b.com")).toBeNull();
    expect(normalizeUrl("javascript:void(0)", "https://example.com")).toBeNull();
    expect(normalizeUrl("::not a url::")).toBeNull();
  });
  it("adds https to bare domains", () => {
    expect(ensureScheme("example.com")).toBe("https://example.com");
    expect(ensureScheme("http://example.com")).toBe("http://example.com");
  });
});

describe("isSameSite", () => {
  it("treats www and non-www as the same site, subdomains as external", () => {
    expect(isSameSite("https://www.example.com/a", "example.com")).toBe(true);
    expect(isSameSite("https://example.com/a", "www.example.com")).toBe(true);
    expect(isSameSite("https://blog.example.com/a", "example.com")).toBe(false);
    expect(isSameSite("https://example.org/a", "example.com")).toBe(false);
  });
});

describe("isCrawlableUrl", () => {
  it("skips assets, admin and cart-style urls", () => {
    expect(isCrawlableUrl("https://e.com/services")).toBe(true);
    expect(isCrawlableUrl("https://e.com/photo.jpg")).toBe(false);
    expect(isCrawlableUrl("https://e.com/wp-admin/edit.php")).toBe(false);
    expect(isCrawlableUrl("https://e.com/product?add-to-cart=1")).toBe(false);
    expect(isCrawlableUrl("https://e.com/brochure.pdf")).toBe(false);
  });
});

describe("helpers", () => {
  it("computes alternate host and utility paths", () => {
    expect(alternateHost("www.example.com")).toBe("example.com");
    expect(alternateHost("example.com")).toBe("www.example.com");
    expect(isUtilityPath("https://e.com/privacy-policy")).toBe(true);
    expect(isUtilityPath("https://e.com/services/roofing")).toBe(false);
  });
});
