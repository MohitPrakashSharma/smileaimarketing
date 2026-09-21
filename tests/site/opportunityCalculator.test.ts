import { describe, expect, it } from "vitest";
import { computeOpportunity, parseField, validateInputs, EMPTY_INPUTS, ILLUSTRATIVE_INPUTS } from "@/lib/opportunityCalculator";

describe("opportunity calculator", () => {
  it("applies the four formulas in order", () => {
    const r = computeOpportunity({ monthlyVisitors: 1000, currentRate: 2, targetRate: 5, patientRate: 50, contribution: 400 });
    expect(r.additionalEnquiries).toBeCloseTo(30); // 1000 × 3%
    expect(r.additionalPatients).toBeCloseTo(15); // 30 × 50%
    expect(r.monthlyContribution).toBeCloseTo(6000); // 15 × 400
    expect(r.dailyContribution).toBeCloseTo(200); // 6000 ÷ 30
    expect(r.noUplift).toBe(false);
  });

  it("uses only the positive difference between target and current", () => {
    const r = computeOpportunity({ monthlyVisitors: 1000, currentRate: 5, targetRate: 2, patientRate: 50, contribution: 400 });
    expect(r.additionalEnquiries).toBe(0);
    expect(r.monthlyContribution).toBe(0);
    expect(r.noUplift).toBe(true);
  });

  it("rejects percentages outside 0–100 and negative numbers", () => {
    expect(parseField("currentRate", "120").error).toMatch(/between 0 and 100/);
    expect(parseField("targetRate", "-1").error).toMatch(/negative/);
    expect(parseField("monthlyVisitors", "abc").error).toMatch(/number/);
    expect(parseField("contribution", "1,250").value).toBe(1250);
    expect(parseField("patientRate", "45 %").value).toBe(45);
  });

  it("treats blanks as incomplete, not invalid", () => {
    const v = validateInputs(EMPTY_INPUTS);
    expect(v.complete).toBe(false);
    expect(Object.keys(v.errors)).toHaveLength(0);
    expect(validateInputs(ILLUSTRATIVE_INPUTS).complete).toBe(true);
  });
});
