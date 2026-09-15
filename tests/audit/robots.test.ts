import { describe, it, expect } from "vitest";
import { parseRobots, isAllowed, blocksEverything } from "@/lib/audit/core/robots";

describe("robots.txt", () => {
  const body = `
# comment
User-agent: *
Disallow: /private/
Disallow: /tmp*
Allow: /private/public-doc
Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-news.xml

User-agent: SmileAIAuditBot
Disallow: /bot-only/
`;
  it("parses groups, rules and sitemaps", () => {
    const r = parseRobots(body, "googlebot");
    expect(r.disallow).toEqual(["/private/", "/tmp*"]);
    expect(r.allow).toEqual(["/private/public-doc"]);
    expect(r.sitemaps).toHaveLength(2);
    expect(r.unrestricted).toBe(false);
  });
  it("prefers our own user-agent group when present", () => {
    const r = parseRobots(body, "smileaiauditbot");
    expect(r.disallow).toEqual(["/bot-only/"]);
    expect(isAllowed(r, "https://example.com/private/x")).toBe(true);
    expect(isAllowed(r, "https://example.com/bot-only/x")).toBe(false);
  });
  it("applies longest-match precedence, wildcards and end anchors", () => {
    const r = parseRobots(body, "googlebot");
    expect(isAllowed(r, "https://example.com/private/secret")).toBe(false);
    expect(isAllowed(r, "https://example.com/private/public-doc")).toBe(true);
    expect(isAllowed(r, "https://example.com/tmpfile")).toBe(false);
    expect(isAllowed(r, "https://example.com/public")).toBe(true);
    const anchored = parseRobots("User-agent: *\nDisallow: /*.pdf$\n");
    expect(isAllowed(anchored, "https://e.com/a/b.pdf")).toBe(false);
    expect(isAllowed(anchored, "https://e.com/a/b.pdfx")).toBe(true);
  });
  it("detects a blanket block and treats an empty/missing file as unrestricted", () => {
    expect(blocksEverything(parseRobots("User-agent: *\nDisallow: /\n"))).toBe(true);
    expect(blocksEverything(parseRobots("User-agent: *\nDisallow: /\nAllow: /\n"))).toBe(false);
    expect(parseRobots("").unrestricted).toBe(true);
    expect(parseRobots("User-agent: *\nDisallow:\n").disallow).toEqual([]);
  });
});
