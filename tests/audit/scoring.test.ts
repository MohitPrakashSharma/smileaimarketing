import { describe, it, expect } from "vitest";
import { penaltyFor, scorePillar, computeScores, gradeFor } from "@/lib/audit/scoring";
import { priorityScore, escalateSeverity, bucketFor, maxSeverity } from "@/lib/audit/priority";
import type { CheckRun, CheckDefinition } from "@/lib/audit/checks/types";

const def = (id: string, pillar: CheckDefinition["pillar"], weight: number, extra: Partial<CheckDefinition> = {}): CheckDefinition => ({
  id, pillar, section: "B1", title: id, severity: "MEDIUM", weight, impact: 3, effort: 2, confidence: 90, expected: "", why: "", fix: "", run: () => ({ status: "PASS", affected: [] }), ...extra,
});
const run = (d: CheckDefinition, status: "PASS" | "FAIL" | "SKIPPED", pageShare = 1, affected = 1): CheckRun => ({
  def: d, outcome: { status, affected: status === "FAIL" ? Array.from({ length: affected }, (_, i) => ({ url: `https://x/${i}` })) : [] }, affectedPageCount: status === "FAIL" ? affected : 0, pageShare: status === "FAIL" ? pageShare : 0, severity: status === "FAIL" ? d.severity : null, affectsHomepage: false, affectsKeyPage: false,
});

describe("penalties and pillar scores", () => {
  it("scales penalty with page share, full weight at ≥50% of pages", () => {
    expect(penaltyFor(20, 1)).toBe(20);
    expect(penaltyFor(20, 0.5)).toBe(20);
    expect(penaltyFor(20, 0.25)).toBe(10);
    expect(penaltyFor(20, 0.05)).toBe(2);
    expect(penaltyFor(20, 0)).toBe(0);
  });
  it("subtracts from 100 and keeps a sorted ledger; skipped checks don't count", () => {
    const runs = [run(def("a", "TECHNICAL", 30), "FAIL", 1), run(def("b", "TECHNICAL", 10), "FAIL", 0.25), run(def("c", "TECHNICAL", 50), "PASS"), run(def("d", "TECHNICAL", 50), "SKIPPED"), run(def("e", "CONTENT", 40), "FAIL", 1)];
    const t = scorePillar(runs, "TECHNICAL");
    expect(t.score).toBe(65); // 100 - 30 - 5
    expect(t.penalties.map((p) => p.checkId)).toEqual(["a", "b"]);
    expect(t.checksRun).toBe(3);
    expect(t.checksFailed).toBe(2);
    expect(scorePillar(runs, "CONTENT").score).toBe(60);
    expect(scorePillar(runs, "SEARCH").score).toBeNull();
  });
  it("floors at 0", () => {
    expect(scorePillar([run(def("a", "TECHNICAL", 80), "FAIL"), run(def("b", "TECHNICAL", 80), "FAIL")], "TECHNICAL").score).toBe(0);
  });
  it("renormalises overall across measured pillars only", () => {
    const runs = [run(def("a", "TECHNICAL", 20), "FAIL"), run(def("e", "CONTENT", 40), "FAIL")];
    const s = computeScores(runs, { localRelevant: false, searchMeasured: false });
    // technical 80 × .35 + content 60 × .30 over weight sum .65
    expect(s.overall).toBe(Math.round((80 * 0.35 + 60 * 0.3) / 0.65));
    expect(s.search.score).toBeNull();
    expect(s.local.score).toBeNull();
    expect(s.local.reason).toMatch(/no physical location/);
  });
  it("grades", () => {
    expect(gradeFor(95)).toBe("excellent");
    expect(gradeFor(75)).toBe("good");
    expect(gradeFor(60)).toBe("needs_work");
    expect(gradeFor(10)).toBe("at_risk");
    expect(gradeFor(null)).toBe("not_measured");
  });
});

describe("severity escalation", () => {
  it("escalates by page share and homepage, caps low confidence", () => {
    expect(escalateSeverity("MEDIUM", { pageShare: 0.6, affectsHomepage: false, affectsKeyPage: false, confidence: 90 })).toBe("HIGH");
    expect(escalateSeverity("MEDIUM", { pageShare: 0.1, affectsHomepage: false, affectsKeyPage: false, confidence: 90 })).toBe("MEDIUM");
    expect(escalateSeverity("HIGH", { pageShare: 0.6, affectsHomepage: true, affectsKeyPage: true, confidence: 90 })).toBe("CRITICAL");
    expect(escalateSeverity("HIGH", { pageShare: 0.6, affectsHomepage: false, affectsKeyPage: true, confidence: 90 })).toBe("HIGH");
    expect(escalateSeverity("CRITICAL", { pageShare: 1, affectsHomepage: true, affectsKeyPage: true, confidence: 50 })).toBe("MEDIUM");
    expect(maxSeverity(["LOW", "OPPORTUNITY", "MEDIUM", null])).toBe("OPPORTUNITY");
  });
});

describe("priority", () => {
  it("orders critical/high-impact/low-effort/site-wide first", () => {
    const critical = priorityScore({ severity: "CRITICAL", impact: 5, effort: 1, confidence: 95, pageShare: 1, affectsHomepage: true });
    const high = priorityScore({ severity: "HIGH", impact: 4, effort: 2, confidence: 95, pageShare: 1, affectsHomepage: false });
    const mediumOnePage = priorityScore({ severity: "MEDIUM", impact: 3, effort: 2, confidence: 90, pageShare: 0.05, affectsHomepage: false });
    const lowHardWork = priorityScore({ severity: "LOW", impact: 1, effort: 5, confidence: 90, pageShare: 1, affectsHomepage: false });
    expect(critical).toBeGreaterThan(high);
    expect(high).toBeGreaterThan(mediumOnePage);
    expect(mediumOnePage).toBeGreaterThan(lowHardWork);
    // same finding, more pages → higher priority
    expect(priorityScore({ severity: "MEDIUM", impact: 3, effort: 2, confidence: 90, pageShare: 1, affectsHomepage: false })).toBeGreaterThan(mediumOnePage);
    // lower confidence → lower priority
    expect(priorityScore({ severity: "HIGH", impact: 4, effort: 2, confidence: 50, pageShare: 1, affectsHomepage: false })).toBeLessThan(high);
  });
  it("buckets by effort and severity", () => {
    expect(bucketFor({ severity: "CRITICAL", impact: 5, effort: 1 })).toBe("this_week");
    expect(bucketFor({ severity: "MEDIUM", impact: 3, effort: 2 })).toBe("this_month");
    expect(bucketFor({ severity: "HIGH", impact: 4, effort: 4 })).toBe("this_quarter");
    expect(bucketFor({ severity: "OPPORTUNITY", impact: 4, effort: 1 })).toBe("this_week");
  });
});
