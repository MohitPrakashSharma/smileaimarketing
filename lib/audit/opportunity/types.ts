/**
 * Automated financial-opportunity scenario for an audit report.
 *
 * The audit itself measures a website: it never knows how many people visit,
 * how many enquire, or what a patient is worth. Those inputs can only come
 * from data the practice has authorised (analytics, booking/CRM, finance) —
 * or, when nothing is authorised, from a clearly labelled illustration.
 * Every number the section shows carries its source, so the report can keep
 * measured facts, authorised business data, assumptions and hypotheticals
 * apart.
 */

export type OpportunityInputKey = "monthlyVisitors" | "currentRate" | "targetRate" | "patientRate" | "contribution";

export type OpportunitySourceKind =
  | "ga4" // Google Analytics 4 Data API (authorised property)
  | "gsc" // Google Search Console (context only — clicks are not visitors or enquiries)
  | "crm" // booking / practice-management export
  | "finance" // authorised financial figures (contribution per patient)
  | "practice_provided" // figures the practice gave us, recorded by our team
  | "assumption" // an improvement assumption we apply and label as such
  | "illustrative"; // placeholder example numbers, never about the practice

export interface SourcedValue {
  /** Rates are fractions (0–1); visitors and contribution are plain numbers (CAD). */
  value: number;
  source: OpportunitySourceKind;
  /** Human label for the report, e.g. "GA4 sessions (Aug 2026)". */
  label: string;
  /** Measurement period the value covers, when known. */
  period: string | null;
  /** What the number counts — sessions vs users, enquiries vs appointments vs patients. */
  measure?: string;
}

export type OpportunityInputs = Partial<Record<OpportunityInputKey, SourcedValue>>;

export type OpportunityMode =
  | "verified" // Mode A — every input from an authorised source (target rate = documented assumption)
  | "partial" // Mode B — some authorised inputs; only what they support is calculated
  | "illustrative" // Mode C — no authorised inputs; labelled example scenario
  | "formula_only"; // Mode C — no authorised inputs and illustrations disabled

export interface OpportunityFigures {
  additionalEnquiries: number | null;
  additionalPatients: number | null;
  monthlyContribution: number | null;
  dailyContribution: number | null;
}

export interface OpportunityScenario {
  mode: OpportunityMode;
  heading: string;
  /** Inputs actually used, with provenance; null when the input was not available. */
  inputs: Record<OpportunityInputKey, SourcedValue | null>;
  /** Inputs that were not available from any authorised source (Modes B and C). */
  missing: OpportunityInputKey[];
  figures: OpportunityFigures;
  /** True when the figures come from example inputs, not the practice's data. */
  illustrative: boolean;
  /** Plain-English lines the report prints under the figures. */
  assumptions: string[];
  sources: string[];
  disclaimer: string;
  /** Measurement periods of the authorised inputs, deduplicated. */
  periods: string[];
}

export const INPUT_LABEL: Record<OpportunityInputKey, string> = {
  monthlyVisitors: "Monthly website visitors",
  currentRate: "Current enquiry rate",
  targetRate: "Improved enquiry rate",
  patientRate: "Enquiries that become patients",
  contribution: "Contribution per new patient",
};
