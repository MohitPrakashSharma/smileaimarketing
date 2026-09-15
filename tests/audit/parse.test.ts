import { describe, it, expect } from "vitest";
import { parsePage } from "@/lib/audit/core/parse";
import { MALFORMED, HEALTHY } from "../fixtures/sites";

describe("parsePage", () => {
  it("extracts the full fact set from a well-formed page", () => {
    const f = parsePage(HEALTHY["https://healthy.test/"].body!, "https://healthy.test/", "healthy.test");
    expect(f.title).toMatch(/Bright Plumbing/);
    expect(f.metaDescription).toMatch(/Licensed Toronto plumbers/);
    expect(f.canonical).toBe("https://healthy.test/");
    expect(f.h1).toEqual(["Plumber in Toronto you can call at 3am"]);
    expect(f.viewport).toBe(true);
    expect(f.lang).toBe("en");
    expect(f.hasDoctype).toBe(true);
    expect(f.charset).toBe("utf-8");
    expect(f.wordCount).toBeGreaterThan(300);
    expect(f.links.filter((l) => l.internal).map((l) => l.href)).toContain("https://healthy.test/services");
    expect(f.images[0]).toMatchObject({ src: "https://healthy.test/img/van.jpg", alt: "Bright Plumbing service van", hasDimensions: true });
    expect(f.schemaTypes).toEqual(["Plumber"]);
    expect(f.schemaErrors).toBe(0);
    expect(f.hasTelLink).toBe(true);
    expect(f.hasForm).toBe(true);
    expect(f.hasPrimaryCta).toBe(true);
    expect(f.ogTagsPresent).toBe(true);
    expect(f.hasAddressText).toBe(true);
    expect(f.mixedContentUrls).toEqual([]);
  });

  it("survives malformed HTML and reports what it can", () => {
    const f = parsePage(MALFORMED["https://malformed.test/"].body!, "https://malformed.test/", "malformed.test");
    expect(f.title).toMatch(/Malformed/);
    expect(f.hasDoctype).toBe(false);
    expect(f.charset).toBeNull();
    expect(f.viewport).toBe(false);
    expect(f.h1).toEqual(["Heading"]);
    expect(f.headingSequence).toEqual([1, 3]);
    expect(f.schemaErrors).toBe(1); // trailing comma
    expect(f.schemaTypes).toEqual([]);
    expect(f.links.map((l) => l.href)).toEqual(expect.arrayContaining(["https://malformed.test/page-2", "https://malformed.test/page-3"]));
    expect(f.images.filter((i) => i.alt === null)).toHaveLength(1); // one missing alt, one alt=""
    expect(f.wordCount).toBeGreaterThan(300);
  });

  it("detects mixed content and noindex", () => {
    const html = `<!DOCTYPE html><html><head><meta name="robots" content="NOINDEX, follow"><script src="http://cdn.example.com/x.js"></script></head><body><img src="http://img.example.com/a.png"><p>hi</p></body></html>`;
    const f = parsePage(html, "https://secure.test/", "secure.test");
    expect(f.robotsMeta).toBe("noindex, follow");
    expect(f.mixedContentUrls).toEqual(["http://cdn.example.com/x.js", "http://img.example.com/a.png"]);
  });

  it("produces a stable text hash for identical bodies regardless of markup", () => {
    const a = parsePage("<html><body><main><p>Hello   world</p></main></body></html>", "https://a.test/", "a.test");
    const b = parsePage("<html><body><main><div>Hello world</div></main></body></html>", "https://a.test/x", "a.test");
    expect(a.textHash).toBe(b.textHash);
  });
});

describe("parser robustness (validation round)", () => {
  it("handles inline-SVG data URIs inside attributes and bare alt attributes", () => {
    const html = `<html><body><img alt class="framer" src="data:image/svg+xml,<svg display=&quot;block&quot;/>"><img alt src="/real.png"><img src="/noalt.png"><img alt="" src="/deco.png"><a href="/x" data-json='{"a":">"}'>x</a></body></html>`;
    const f = parsePage(html, "https://a.test/", "a.test");
    expect(f.images.map((i) => i.src)).toEqual(["https://a.test/real.png", "https://a.test/noalt.png", "https://a.test/deco.png"]);
    expect(f.images.filter((i) => i.alt === null).map((i) => i.src)).toEqual(["https://a.test/noalt.png"]);
    expect(f.links.map((l) => l.href)).toEqual(["https://a.test/x"]);
  });
  it("recognises an empty SPA mount point and a soft-404 page", () => {
    const spa = parsePage(`<html><head><title>App</title></head><body><div id="root"></div><script src="/a.js"></script><script src="/b.js"></script></body></html>`, "https://a.test/", "a.test");
    expect(spa.spaRootEmpty).toBe(true);
    const ok = parsePage(`<html><body><main><h1>Gallery</h1>${"<img src='/i.png' alt='x'>".repeat(20)}</main><script src="/a.js"></script></body></html>`, "https://a.test/", "a.test");
    expect(ok.spaRootEmpty).toBe(false);
    const soft = parsePage(`<html><head><title>Page not found</title></head><body><p>Nope</p></body></html>`, "https://a.test/", "a.test");
    expect(soft.looksLikeErrorPage).toBe(true);
  });
});
