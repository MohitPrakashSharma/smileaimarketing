import { describe, expect, it } from "vitest";
import { buildOpportunityScenario, figuresConsistent } from "@/lib/audit/opportunity/scenario";
import { collectOpportunityInputs, normaliseStoredInput, practiceProvidedAdapter, ga4Adapter, searchConsoleAdapter, crmAdapter, financeAdapter } from "@/lib/audit/opportunity/sources";
import { computeOpportunity, computeOpportunityFromFractions } from "@/lib/opportunityCalculator";
import type { OpportunityInputs } from "@/lib/audit/opportunity/types";

const OPTS = { upliftPoints: 2, illustrativeAllowed: true };
const sv = (value: number, source: OpportunityInputs[keyof OpportunityInputs] extends infer T ? (T extends { source: infer S } ? S : never) : never, period: string | null = "Aug 2026", label = "x") => ({ value, source, label, period });

describe("opportunity scenario engine", () => {
  it("Mode A: verified inputs produce the same figures as the homepage engine, with sources and period", () => {
    const inputs: OpportunityInputs = {
      monthlyVisitors: sv(1000, "ga4", "Aug 2026", "GA4 sessions"),
      currentRate: sv(0.02, "ga4", "Aug 2026", "GA4 enquiry conversions"),
      patientRate: sv(0.5, "crm", "Aug 2026", "booking export"),
      contribution: sv(400, "finance", "FY2025", "practice financials"),
    };
    const sc = buildOpportunityScenario(inputs, OPTS);
    expect(sc.mode).toBe("verified");
    expect(sc.illustrative).toBe(false);
    // improved rate = 2% + 2 points = 4% (assumption)
    expect(sc.inputs.targetRate?.source).toBe("assumption");
    expect(sc.inputs.targetRate?.value).toBeCloseTo(0.04);
    const engine = computeOpportunity({ monthlyVisitors: 1000, currentRate: 2, targetRate: 4, patientRate: 50, contribution: 400 });
    expect(sc.figures.additionalEnquiries).toBeCloseTo(engine.additionalEnquiries); // 20
    expect(sc.figures.additionalPatients).toBeCloseTo(engine.additionalPatients); // 10
    expect(sc.figures.monthlyContribution).toBeCloseTo(engine.monthlyContribution); // 4000
    expect(sc.figures.dailyContribution).toBeCloseTo(engine.monthlyContribution / 30);
    expect(figuresConsistent(sc.figures)).toBe(true);
    expect(sc.periods).toEqual(["Aug 2026", "FY2025"]);
    expect(sc.sources).toContain("GA4 sessions");
    expect(sc.missing).toEqual([]);
    expect(sc.assumptions.join(" ")).toMatch(/assumption, not a measurement/);
    expect(sc.disclaimer).toMatch(/not a measured loss/);
  });

  it("fractions and percentages go through one formula", () => {
    const a = computeOpportunityFromFractions({ monthlyVisitors: 1200, currentRate: 0.02, targetRate: 0.04, patientRate: 0.4, contribution: 600 });
    const b = computeOpportunity({ monthlyVisitors: 1200, currentRate: 2, targetRate: 4, patientRate: 40, contribution: 600 });
    expect(a).toEqual(b);
    expect(a.monthlyContribution).toBeCloseTo(5760);
    expect(a.dailyContribution).toBeCloseTo(192);
  });

  it("Mode B: partial inputs compute only what they support and never substitute values", () => {
    const sc = buildOpportunityScenario({ monthlyVisitors: sv(2000, "ga4"), currentRate: sv(0.01, "ga4") }, OPTS);
    expect(sc.mode).toBe("partial");
    expect(sc.figures.additionalEnquiries).toBeCloseTo(40); // 2000 × 2 points
    expect(sc.figures.additionalPatients).toBeNull();
    expect(sc.figures.monthlyContribution).toBeNull();
    expect(sc.figures.dailyContribution).toBeNull();
    expect(sc.missing).toEqual(["patientRate", "contribution"]);
    expect(figuresConsistent(sc.figures)).toBe(true);

    // visitors + rates + patient rate, but no contribution → patients yes, money no
    const sc2 = buildOpportunityScenario({ monthlyVisitors: sv(2000, "ga4"), currentRate: sv(0.01, "ga4"), patientRate: sv(0.25, "practice_provided") }, OPTS);
    expect(sc2.figures.additionalPatients).toBeCloseTo(10);
    expect(sc2.figures.monthlyContribution).toBeNull();

    // contribution alone → nothing can be calculated, but the mode is still partial and no $0 appears
    const sc3 = buildOpportunityScenario({ contribution: sv(500, "finance") }, OPTS);
    expect(sc3.mode).toBe("partial");
    expect(sc3.figures).toEqual({ additionalEnquiries: null, additionalPatients: null, monthlyContribution: null, dailyContribution: null });
  });

  it("Mode C: no authorised data → labelled illustration, or the formula only when illustrations are off", () => {
    const ill = buildOpportunityScenario({}, OPTS);
    expect(ill.mode).toBe("illustrative");
    expect(ill.illustrative).toBe(true);
    expect(ill.figures.monthlyContribution).toBeCloseTo(5760);
    expect(ill.disclaimer).toMatch(/not benchmarks, not measurements from this audit/);
    expect(Object.values(ill.inputs).every((v) => v?.source === "illustrative")).toBe(true);

    const formula = buildOpportunityScenario({}, { ...OPTS, illustrativeAllowed: false });
    expect(formula.mode).toBe("formula_only");
    expect(formula.figures.monthlyContribution).toBeNull(); // never CAD $0
    expect(formula.disclaimer).toMatch(/no dollar figure/);
  });

  it("ignores assumption/illustrative-sourced inputs as if they were not authorised, and clamps the uplift", () => {
    const sc = buildOpportunityScenario({ monthlyVisitors: { value: 900, source: "illustrative", label: "x", period: null } }, OPTS);
    expect(sc.mode).toBe("illustrative"); // an unauthorised input does not count as data
    const capped = buildOpportunityScenario({ monthlyVisitors: sv(100, "ga4"), currentRate: sv(0.995, "ga4"), patientRate: sv(1, "crm"), contribution: sv(10, "finance") }, OPTS);
    expect(capped.inputs.targetRate?.value).toBeLessThanOrEqual(1);
  });

  it("an authorised target rate overrides the uplift assumption", () => {
    const sc = buildOpportunityScenario({ monthlyVisitors: sv(1000, "ga4"), currentRate: sv(0.02, "ga4"), targetRate: sv(0.05, "practice_provided", null, "target set by the practice"), patientRate: sv(0.5, "crm"), contribution: sv(400, "finance") }, OPTS);
    expect(sc.inputs.targetRate?.source).toBe("practice_provided");
    expect(sc.figures.additionalEnquiries).toBeCloseTo(30);
    expect(sc.assumptions.join(" ")).not.toMatch(/percentage points/);
  });

  it("is deterministic", () => {
    const inputs: OpportunityInputs = { monthlyVisitors: sv(1500, "ga4"), currentRate: sv(0.03, "ga4"), patientRate: sv(0.4, "crm"), contribution: sv(650, "finance") };
    expect(buildOpportunityScenario(inputs, OPTS)).toEqual(buildOpportunityScenario(inputs, OPTS));
  });
});

describe("opportunity input sources", () => {
  it("validates stored inputs: fractions for rates, authorised sources only, sane ranges", () => {
    expect(normaliseStoredInput("currentRate", { value: 0.02, source: "ga4" })?.value).toBe(0.02);
    expect(normaliseStoredInput("currentRate", { value: 2, source: "ga4" })).toBeNull(); // percent, not a fraction
    expect(normaliseStoredInput("currentRate", { value: -0.1, source: "ga4" })).toBeNull();
    expect(normaliseStoredInput("monthlyVisitors", { value: "1200", source: "practice_provided", period: " Aug 2026 " })).toMatchObject({ value: 1200, period: "Aug 2026" });
    expect(normaliseStoredInput("monthlyVisitors", { value: 1200, source: "illustrative" })).toBeNull(); // not an authorised source
    expect(normaliseStoredInput("monthlyVisitors", { value: 1200, source: "pagespeed" })).toBeNull(); // never a revenue source
    expect(normaliseStoredInput("contribution", { value: Number.NaN, source: "finance" })).toBeNull();
    expect(normaliseStoredInput("contribution", "600")).toBeNull();
    expect(normaliseStoredInput("contribution", { value: 600, source: "finance" })?.label).toMatch(/contribution per new patient from practice financials/);
  });

  it("reads only well-formed inputs from the audit's summaryJson and ignores junk", () => {
    const audit = { summaryJson: { opportunityInputs: { monthlyVisitors: { value: 1800, source: "ga4", period: "Jul 2026" }, currentRate: { value: 150, source: "ga4" }, patientRate: "bad" }, other: 1 } };
    const got = practiceProvidedAdapter(audit);
    expect(got.monthlyVisitors?.value).toBe(1800);
    expect(got.currentRate).toBeUndefined();
    expect(got.patientRate).toBeUndefined();
    expect(practiceProvidedAdapter({ summaryJson: null })).toEqual({});
    expect(practiceProvidedAdapter({ summaryJson: { opportunityInputs: "nope" } })).toEqual({});
  });

  it("integrations that are not connected return nothing and are combined without inventing inputs", () => {
    expect(ga4Adapter()).toEqual({});
    expect(searchConsoleAdapter()).toEqual({});
    expect(crmAdapter()).toEqual({});
    expect(financeAdapter()).toEqual({});
    expect(collectOpportunityInputs({ summaryJson: null })).toEqual({});
    const merged = collectOpportunityInputs({ summaryJson: { opportunityInputs: { contribution: { value: 500, source: "finance" } } } });
    expect(Object.keys(merged)).toEqual(["contribution"]);
  });

  it("existing audits with no financial data get the illustrative scenario (or formula) — never an error or $0", () => {
    const sc = buildOpportunityScenario(collectOpportunityInputs({ summaryJson: { localComparisonNarrative: null } }), OPTS);
    expect(sc.mode).toBe("illustrative");
    expect(sc.figures.monthlyContribution).not.toBe(0);
  });
});
