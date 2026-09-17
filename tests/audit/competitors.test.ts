import { describe, it, expect } from "vitest";
import type { Competitor } from "@prisma/client";
import { selectCompetitors, isPediatric } from "@/lib/audit/competitors/select";
import { parsePlaces, haversineKm } from "@/lib/audit/competitors/places";
import { fromPerfResult, ownHomepageMeasurement } from "@/lib/audit/competitors/measure";
import { buildLocalComparison, competitorGaps } from "@/lib/audit/competitors/view";
import { normalizePsiResponse } from "@/lib/audit/providers/pagespeed";
import { psiResponse, POOR_MOBILE_LH13 } from "../fixtures/pagespeed";
import LH13_ALL from "../fixtures/psi-lighthouse13-all-categories.json";
import type { PerfRow } from "@/lib/audit/view/performanceView";
import type { CompetitorMeasurement, DiscoveredPlace } from "@/lib/audit/competitors/types";

const place = (over: Partial<DiscoveredPlace> & { name: string }): DiscoveredPlace => ({ placeId: `p-${over.name}`, website: `https://${over.name.toLowerCase().replace(/\s+/g, "")}.ca`, address: "1 Main St, Newmarket, ON", city: "Newmarket", types: ["dentist", "point_of_interest"], businessStatus: "OPERATIONAL", distanceKm: 2, ...over });
const audited = { name: "Apple Tree Dental for Kids", website: "https://appletreedentalforkids.com", placeId: "p-self", category: "Dental Clinic" };

describe("competitor selection", () => {
  it("keeps only operating dental practices with a website, never the audited practice, deduplicated by domain", () => {
    const picked = selectCompetitors({
      audited: { ...audited, name: "Main Street Dental" },
      candidates: [
        place({ name: "Main Street Dental", placeId: "p-self" }), // the practice itself (place id)
        place({ name: "Main St Dental", website: "https://appletreedentalforkids.com/about" }), // same domain
        place({ name: "Closed Clinic", businessStatus: "CLOSED_PERMANENTLY" }),
        place({ name: "No Site Dental", website: null }),
        place({ name: "Pharmacy Plus", types: ["pharmacy"] }),
        place({ name: "Far Away Dental", distanceKm: 80 }),
        place({ name: "Lakeside Dental" }),
        place({ name: "Lakeside Dental Group", website: "https://lakesidedental.ca/team" }), // duplicate domain
        place({ name: "Yonge Dental" }),
      ],
      limit: 3,
    });
    expect(picked.map((p) => p.name)).toEqual(["Lakeside Dental", "Yonge Dental"]);
    expect(picked[0].relevance).toBe("dental practice · Newmarket · 2 km away");
  });

  it("orders by distance and caps at the limit", () => {
    const picked = selectCompetitors({ audited: { name: "X Dental", website: "https://x.ca" }, candidates: [place({ name: "C Dental", distanceKm: 9 }), place({ name: "A Dental", distanceKm: 1.2 }), place({ name: "B Dental", distanceKm: 4 }), place({ name: "D Dental", distanceKm: null })], limit: 2 });
    expect(picked.map((p) => p.name)).toEqual(["A Dental", "B Dental"]);
  });

  it("compares a pediatric practice only with pediatric practices, and gives up rather than fall back to general dentists", () => {
    expect(isPediatric("Apple Tree Dental for Kids")).toBe(true);
    const mixed = [place({ name: "Newmarket Family Dental" }), place({ name: "Little Smiles Pediatric Dentistry" }), place({ name: "Bright Kids Dental" }), place({ name: "Yonge Dental" })];
    const picked = selectCompetitors({ audited, candidates: mixed, limit: 3 });
    expect(picked.map((p) => p.name)).toEqual(["Little Smiles Pediatric Dentistry", "Bright Kids Dental"]);
    expect(picked.every((p) => p.relevance.startsWith("pediatric dentist"))).toBe(true);
    const onlyOne = selectCompetitors({ audited, candidates: [place({ name: "Newmarket Family Dental" }), place({ name: "Bright Kids Dental" })], limit: 3 });
    expect(onlyOne).toEqual([]);
  });
});

describe("Places (New) parsing", () => {
  it("maps the response fields and computes distance from the bias centre", () => {
    const hits = parsePlaces({ places: [{ id: "abc", displayName: { text: "Lakeside Dental" }, websiteUri: "https://www.lakesidedental.ca/", formattedAddress: "5 Lake Rd, Newmarket, ON", addressComponents: [{ longText: "Newmarket", types: ["locality"] }], location: { latitude: 44.06, longitude: -79.46 }, types: ["dentist"], businessStatus: "OPERATIONAL" }, {}] }, { latitude: 44.05, longitude: -79.46 });
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ placeId: "abc", name: "Lakeside Dental", website: "https://www.lakesidedental.ca/", city: "Newmarket", types: ["dentist"], businessStatus: "OPERATIONAL" });
    expect(hits[0].distanceKm).toBeCloseTo(1.1, 1);
    expect(hits[1]).toMatchObject({ placeId: "", name: "", website: null, distanceKm: null });
    expect(haversineKm({ latitude: 43.65, longitude: -79.38 }, { latitude: 43.65, longitude: -79.38 })).toBe(0);
  });
});

const home = "https://appletreedentalforkids.com/";
const ownRow = (status: "ok" | "unavailable" = "ok"): PerfRow => {
  const r = normalizePsiResponse(home, "mobile", psiResponse(home, POOR_MOBILE_LH13), 1);
  return { url: r.url, strategy: "mobile", pageType: "home", selectionReason: "homepage", status, error: status === "ok" ? null : "PageSpeed API error: quota", field: r.field, lab: status === "ok" ? r.lab : null, lcpElement: null, diagnostics: [], categories: status === "ok" ? r.categories : null, agentic: null, lighthouseVersion: "13.4.1", analysisUtc: "2026-09-17T10:00:00.000Z" };
};
const good: CompetitorMeasurement = fromPerfResult(normalizePsiResponse("https://lakesidedental.ca/", "mobile", LH13_ALL as unknown, 1));
const failed: CompetitorMeasurement = fromPerfResult(normalizePsiResponse("https://yongedental.ca/", "mobile", { error: { message: "x" } }, 1));
const row = (over: Partial<Competitor> & { name: string }): Competitor => ({ id: `c-${over.name}`, auditId: "a1", website: `https://${over.name.toLowerCase().replace(/\s+/g, "")}.ca/`, rank: 1, mapScore: null, createdAt: new Date("2026-09-17T09:00:00Z"), source: "GOOGLE_PLACES", placeId: "p", address: "Newmarket, ON", relevance: "pediatric dentist · Newmarket · 2 km away", discoveredAt: new Date("2026-09-17T09:00:00Z"), measuredAt: new Date("2026-09-17T09:05:00Z"), measurementJson: null, ...over });
const business = { name: "Apple Tree Dental for Kids", website: "https://appletreedentalforkids.com", city: "Newmarket" };

describe("measurements", () => {
  it("keeps Google's numbers and marks a failed run unavailable with the reason — never a substitute value", () => {
    expect(good.status).toBe("ok");
    expect(good.performanceScore).toBeTypeOf("number");
    expect(good.accessibility).toBeTypeOf("number");
    expect(failed.status).toBe("unavailable");
    expect(failed.performanceScore).toBeNull();
    expect(failed.lcpMs).toBeNull();
    expect(failed.seo).toBeNull();
    expect(failed.error).toBeTruthy();
  });
  it("takes the audited practice's side from its stored homepage × mobile row", () => {
    const own = ownHomepageMeasurement([ownRow()]);
    expect(own?.status).toBe("ok");
    expect(own?.performanceScore).toBe(Math.round((POOR_MOBILE_LH13.score ?? 0) * 100));
    expect(ownHomepageMeasurement([])).toBeNull();
    expect(ownHomepageMeasurement([ownRow("unavailable")])?.status).toBe("unavailable");
  });
});

describe("local comparison builder", () => {
  it("returns null with fewer than two verified competitors or V1-only rows (no placeholder section)", () => {
    expect(buildLocalComparison(business, [], [ownRow()])).toBeNull();
    expect(buildLocalComparison(business, [row({ name: "Lakeside Dental", measurementJson: good as never })], [ownRow()])).toBeNull();
    expect(buildLocalComparison(business, [row({ name: "Old V1 A", source: null }), row({ name: "Old V1 B", source: null })], [ownRow()])).toBeNull();
  });

  it("renders unavailable competitor and practice measurements as null and produces no gaps from them", () => {
    const cmp = buildLocalComparison(business, [row({ name: "Lakeside Dental", measurementJson: failed as never }), row({ name: "Yonge Dental", rank: 2, measurementJson: null })], [ownRow("unavailable")]);
    expect(cmp).not.toBeNull();
    expect(cmp!.competitors.map((c) => c.measurement?.status ?? null)).toEqual(["unavailable", null]);
    expect(cmp!.practice.measurement?.status).toBe("unavailable");
    expect(cmp!.gaps).toEqual([]);
    expect(cmp!.heading).toBe("How Does Your Practice Compare Locally?");
    expect(cmp!.method).toContain("0 of 2 competitor homepages could be measured");
  });

  it("calls out only measured, meaningful differences, in both directions, and switches the heading when competitors lead", () => {
    const cmp = buildLocalComparison(business, [row({ name: "Lakeside Dental", measurementJson: good as never }), row({ name: "Yonge Dental", rank: 2, measurementJson: { ...good, url: "https://yongedental.ca/", performanceScore: 20, lcpMs: 22_000, accessibility: 60 } as never })], [ownRow()]);
    expect(cmp).not.toBeNull();
    const adv = cmp!.gaps.filter((g) => g.direction === "competitor_better");
    const str = cmp!.gaps.filter((g) => g.direction === "practice_better");
    expect(adv.length).toBeGreaterThanOrEqual(2);
    expect(adv.every((g) => g.competitor === "Lakeside Dental")).toBe(true);
    expect(adv.find((g) => g.metric === "performanceScore")?.sentence).toMatch(/Lakeside Dental scores \d+\/100 on Google performance \(mobile\) against your \d+\/100\./);
    expect(str.some((g) => g.competitor === "Yonge Dental" && g.metric === "lcpMs")).toBe(true);
    expect(cmp!.heading).toBe("Where Nearby Practices Have an Advantage");
    expect(cmp!.attribution).toContain("Google Maps");
    expect(cmp!.source).toBe("GOOGLE_PLACES");
    // gaps use exactly the stored numbers
    for (const g of cmp!.gaps) {
      expect(g.practiceValue).toBe((cmp!.practice.measurement as CompetitorMeasurement)[g.metric]);
      expect(g.competitorValue).toBe((cmp!.competitors.find((c) => c.name === g.competitor)!.measurement as CompetitorMeasurement)[g.metric]);
    }
  });

  it("ignores differences below the noise threshold", () => {
    const own = ownHomepageMeasurement([ownRow()])!;
    const near = { ...own, url: "https://x.ca/", performanceScore: (own.performanceScore ?? 0) + 4, lcpMs: (own.lcpMs ?? 0) - 500 };
    expect(competitorGaps(own, [{ name: "X", website: "https://x.ca", domain: "x.ca", relevance: null, measurement: near, measuredAt: null }])).toEqual([]);
  });
});

describe("scoring isolation", () => {
  it("competitor rows change nothing in the audit's scores, findings or checks — only the separate comparison block", async () => {
    const { buildV2Payload } = await import("@/lib/audit/report");
    const audit = { id: "a1", status: "COMPLETED", engine: "CRAWL_V2", overallScore: 74, technicalScore: 89, contentScore: 56, performanceScore: null, searchScore: null, localScore: null, scoreBreakdownJson: { technical: { score: 89 } }, progressJson: null, crawlStatsJson: { pagesCrawled: 40 }, completedAt: new Date(), createdAt: new Date() } as never;
    const withRows = buildV2Payload(audit, [], [], [], [], [], [row({ name: "Lakeside Dental", measurementJson: good as never }), row({ name: "Yonge Dental", rank: 2, measurementJson: { ...good, performanceScore: 5 } as never })], business);
    const without = buildV2Payload(audit, [], [], [], [], [], [], business);
    expect(withRows.scores).toEqual(without.scores);
    expect(withRows.findings).toEqual(without.findings);
    expect(withRows.checks).toEqual(without.checks);
    expect(withRows.severityCounts).toEqual(without.severityCounts);
    expect(without.competitors).toBeNull();
    expect(withRows.competitors?.competitors.map((c) => c.name)).toEqual(["Lakeside Dental", "Yonge Dental"]);
    expect(withRows.scores?.overall).toBe(74);
  });
});
