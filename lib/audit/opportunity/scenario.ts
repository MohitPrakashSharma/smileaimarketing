import { ILLUSTRATIVE_INPUTS, computeOpportunityFromFractions } from "@/lib/opportunityCalculator";
import type { OpportunityFigures, OpportunityInputKey, OpportunityInputs, OpportunityScenario, SourcedValue } from "./types";

/**
 * Turns whatever authorised inputs exist into the scenario the report and
 * PDF both render. Deterministic: the same inputs and options always give
 * the same figures, and the arithmetic is the shared calculator engine.
 *
 *   Mode A (verified)      every input authorised; improved rate = current + uplift assumption
 *   Mode B (partial)       only the figures the available inputs support; missing ones listed
 *   Mode C (illustrative)  no authorised inputs → labelled example inputs (if allowed)
 *   Mode C (formula_only)  no authorised inputs and illustrations not allowed → no dollar amount
 *
 * No mode derives a figure from the audit score, PageSpeed, findings or
 * competitor measurements: those describe the website, not the money.
 */
export interface ScenarioOptions {
  /** Improvement assumption applied to a verified enquiry rate, in percentage points (e.g. 2 → +0.02). */
  upliftPoints: number;
  illustrativeAllowed: boolean;
}

export const HEADING = "What Could These Website Issues Be Costing Your Practice?";
const DISCLAIMER_VERIFIED = "Figures are a scenario built from the authorised data listed here and the stated improvement assumption. They are potential additional contribution if the enquiry rate improved as assumed — not a measured loss, a forecast or a guarantee.";
const DISCLAIMER_PARTIAL = "Only the figures the available data supports are shown; nothing is substituted for the inputs that are missing. What is shown is a scenario, not a measured loss.";
const DISCLAIMER_ILLUSTRATIVE = "These example numbers are placeholders chosen to show how the maths works. They are not benchmarks, not measurements from this audit and say nothing about this practice's actual visitors, enquiries or income.";
const DISCLAIMER_FORMULA = "This audit measured the website, not your traffic, enquiries or income, so no dollar figure is shown. Share those numbers with us in a website review and we will build the scenario with you.";

const AUTHORISED = new Set(["ga4", "gsc", "crm", "finance", "practice_provided"]);
const fmtPct = (f: number) => `${(f * 100).toLocaleString("en-CA", { maximumFractionDigits: 1 })}%`;
const fmtCad = (n: number) => `$${Math.round(n).toLocaleString("en-CA")}`;

const empty = (): OpportunityFigures => ({ additionalEnquiries: null, additionalPatients: null, monthlyContribution: null, dailyContribution: null });
const emptyInputs = (): Record<OpportunityInputKey, SourcedValue | null> => ({ monthlyVisitors: null, currentRate: null, targetRate: null, patientRate: null, contribution: null });

export function buildOpportunityScenario(inputs: OpportunityInputs, opts: ScenarioOptions): OpportunityScenario {
  const authorised = (k: OpportunityInputKey) => (inputs[k] && AUTHORISED.has(inputs[k]!.source) ? inputs[k]! : null);
  const visitors = authorised("monthlyVisitors");
  const current = authorised("currentRate");
  const patientRate = authorised("patientRate");
  const contribution = authorised("contribution");
  const haveAny = Boolean(visitors || current || patientRate || contribution);

  if (!haveAny) return opts.illustrativeAllowed ? illustrativeScenario() : formulaOnlyScenario();

  // Improved rate: an authorised target if the practice set one, otherwise the documented uplift assumption.
  const uplift = Math.max(0, opts.upliftPoints) / 100;
  const target: SourcedValue | null = authorised("targetRate") ?? (current ? { value: Math.min(1, current.value + uplift), source: "assumption", label: `improved enquiry rate = current rate + ${opts.upliftPoints} percentage points (assumption)`, period: null } : null);

  const used = emptyInputs();
  used.monthlyVisitors = visitors;
  used.currentRate = current;
  used.targetRate = target;
  used.patientRate = patientRate;
  used.contribution = contribution;

  const figures = empty();
  if (visitors && current && target) {
    const base = computeOpportunityFromFractions({ monthlyVisitors: visitors.value, currentRate: current.value, targetRate: target.value, patientRate: patientRate?.value ?? 0, contribution: contribution?.value ?? 0 });
    figures.additionalEnquiries = base.additionalEnquiries;
    if (patientRate) figures.additionalPatients = base.additionalPatients;
    if (patientRate && contribution) {
      figures.monthlyContribution = base.monthlyContribution;
      figures.dailyContribution = base.dailyContribution;
    }
  }

  const missing = (["monthlyVisitors", "currentRate", "patientRate", "contribution"] as OpportunityInputKey[]).filter((k) => !used[k]);
  const complete = missing.length === 0 && figures.monthlyContribution !== null;
  const sources = [...new Set([visitors, current, patientRate, contribution, authorised("targetRate")].filter(Boolean).map((v) => v!.label))];
  const periods = [...new Set([visitors, current, patientRate, contribution].filter((v) => v?.period).map((v) => v!.period!))];
  const assumptions: string[] = [];
  if (target?.source === "assumption" && current) assumptions.push(`Improvement assumption: enquiry rate rises from ${fmtPct(current.value)} to ${fmtPct(target.value)} (+${opts.upliftPoints} percentage points). This is an assumption, not a measurement.`);
  if (contribution) assumptions.push(`Contribution per new patient ${fmtCad(contribution.value)} is ${contribution.source === "finance" ? "the practice's authorised figure" : "as provided by the practice"} — contribution, not gross revenue or profit.`);
  if (visitors?.measure) assumptions.push(`Visitors are counted as ${visitors.measure}.`);

  return {
    mode: complete ? "verified" : "partial",
    heading: HEADING,
    inputs: used,
    missing,
    figures,
    illustrative: false,
    assumptions,
    sources,
    disclaimer: complete ? DISCLAIMER_VERIFIED : DISCLAIMER_PARTIAL,
    periods,
  };
}

function illustrativeScenario(): OpportunityScenario {
  const ex = ILLUSTRATIVE_INPUTS;
  const v = { monthlyVisitors: Number(ex.monthlyVisitors), currentRate: Number(ex.currentRate) / 100, targetRate: Number(ex.targetRate) / 100, patientRate: Number(ex.patientRate) / 100, contribution: Number(ex.contribution) };
  const r = computeOpportunityFromFractions(v);
  const mk = (value: number, label: string): SourcedValue => ({ value, source: "illustrative", label, period: null });
  return {
    mode: "illustrative",
    heading: HEADING,
    inputs: {
      monthlyVisitors: mk(v.monthlyVisitors, "example: monthly visitors"),
      currentRate: mk(v.currentRate, "example: current enquiry rate"),
      targetRate: mk(v.targetRate, "example: improved enquiry rate"),
      patientRate: mk(v.patientRate, "example: enquiries that become patients"),
      contribution: mk(v.contribution, "example: contribution per new patient"),
    },
    missing: ["monthlyVisitors", "currentRate", "patientRate", "contribution"],
    figures: { additionalEnquiries: r.additionalEnquiries, additionalPatients: r.additionalPatients, monthlyContribution: r.monthlyContribution, dailyContribution: r.dailyContribution },
    illustrative: true,
    assumptions: [`Illustrative inputs: ${v.monthlyVisitors.toLocaleString("en-CA")} visitors a month, enquiry rate ${fmtPct(v.currentRate)} today and ${fmtPct(v.targetRate)} improved, ${fmtPct(v.patientRate)} of enquiries become patients, ${fmtCad(v.contribution)} contribution per new patient.`],
    sources: ["Illustrative example — no authorised analytics, booking or financial data for this practice"],
    disclaimer: DISCLAIMER_ILLUSTRATIVE,
    periods: [],
  };
}

function formulaOnlyScenario(): OpportunityScenario {
  return {
    mode: "formula_only",
    heading: HEADING,
    inputs: emptyInputs(),
    missing: ["monthlyVisitors", "currentRate", "patientRate", "contribution"],
    figures: empty(),
    illustrative: false,
    assumptions: [],
    sources: ["No authorised analytics, booking or financial data for this practice"],
    disclaimer: DISCLAIMER_FORMULA,
    periods: [],
  };
}

/** Consistency guard shared by tests and renderers: daily is always monthly ÷ 30. */
export function figuresConsistent(f: OpportunityFigures): boolean {
  if (f.monthlyContribution === null || f.dailyContribution === null) return f.monthlyContribution === null && f.dailyContribution === null;
  return Math.abs(f.dailyContribution * 30 - f.monthlyContribution) < 1e-6;
}
