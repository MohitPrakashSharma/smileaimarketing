import type { Audit } from "@prisma/client";
import type { OpportunityInputKey, OpportunityInputs, OpportunitySourceKind, SourcedValue } from "./types";

/**
 * Collects the financial inputs available for an audit, in order of
 * preference, from data the practice has authorised. Each adapter returns
 * only what it can verify; nothing is estimated here.
 *
 * Adapters wired today:
 *   - practice_provided: figures recorded on the audit by our team after the
 *     practice supplied them (stored on `Audit.summaryJson.opportunityInputs`
 *     via the admin endpoint), each with its source and period.
 *
 * Not connected (return nothing, never call out): GA4 Data API, Google Search
 * Console, booking/CRM and finance systems. Add an adapter here when such an
 * integration is authorised; the report and PDF need no change. Google Places
 * and PageSpeed are deliberately not adapters — they say nothing about
 * traffic, conversion or revenue.
 */

export const STORED_INPUTS_KEY = "opportunityInputs";
const KEYS: OpportunityInputKey[] = ["monthlyVisitors", "currentRate", "targetRate", "patientRate", "contribution"];
const AUTHORISED: OpportunitySourceKind[] = ["ga4", "gsc", "crm", "finance", "practice_provided"];

export type StoredOpportunityInputs = Partial<Record<OpportunityInputKey, { value: number; source: OpportunitySourceKind; label?: string; period?: string | null; measure?: string }>>;

const LIMITS: Record<OpportunityInputKey, [number, number]> = {
  monthlyVisitors: [0, 10_000_000],
  currentRate: [0, 1],
  targetRate: [0, 1],
  patientRate: [0, 1],
  contribution: [0, 1_000_000],
};

/** Validates one stored/submitted input. Rates must be fractions (0–1); returns null for anything unusable. */
export function normaliseStoredInput(key: OpportunityInputKey, raw: unknown): SourcedValue | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const value = typeof r.value === "number" ? r.value : Number(r.value);
  const source = r.source as OpportunitySourceKind;
  if (!Number.isFinite(value) || !AUTHORISED.includes(source)) return null;
  const [min, max] = LIMITS[key];
  if (value < min || value > max) return null;
  const label = typeof r.label === "string" && r.label.trim() ? r.label.trim() : defaultLabel(key, source);
  const period = typeof r.period === "string" && r.period.trim() ? r.period.trim() : null;
  const measure = typeof r.measure === "string" && r.measure.trim() ? r.measure.trim() : undefined;
  return { value, source, label, period, measure };
}

function defaultLabel(key: OpportunityInputKey, source: OpportunitySourceKind): string {
  const by: Record<OpportunitySourceKind, string> = { ga4: "Google Analytics 4", gsc: "Google Search Console", crm: "booking system export", finance: "practice financials", practice_provided: "figures provided by the practice", assumption: "assumption", illustrative: "illustrative example" };
  const what: Record<OpportunityInputKey, string> = { monthlyVisitors: "monthly visitors", currentRate: "enquiry rate", targetRate: "improved enquiry rate", patientRate: "enquiry-to-patient rate", contribution: "contribution per new patient" };
  return `${what[key]} from ${by[source]}`;
}

/** Adapter: inputs recorded on the audit by our team. */
export function practiceProvidedAdapter(audit: Pick<Audit, "summaryJson">): OpportunityInputs {
  const summary = (audit.summaryJson ?? null) as Record<string, unknown> | null;
  const stored = (summary?.[STORED_INPUTS_KEY] ?? null) as StoredOpportunityInputs | null;
  if (!stored || typeof stored !== "object") return {};
  const out: OpportunityInputs = {};
  for (const key of KEYS) {
    const v = normaliseStoredInput(key, stored[key]);
    if (v) out[key] = v;
  }
  return out;
}

/** Adapters for integrations that are not connected in this project. They never reach out. */
export function ga4Adapter(): OpportunityInputs {
  return {};
}
export function searchConsoleAdapter(): OpportunityInputs {
  return {};
}
export function crmAdapter(): OpportunityInputs {
  return {};
}
export function financeAdapter(): OpportunityInputs {
  return {};
}

/** Merges adapters in preference order (first authorised source wins per input). */
export function collectOpportunityInputs(audit: Pick<Audit, "summaryJson">): OpportunityInputs {
  const layers: OpportunityInputs[] = [ga4Adapter(), crmAdapter(), financeAdapter(), searchConsoleAdapter(), practiceProvidedAdapter(audit)];
  const out: OpportunityInputs = {};
  for (const layer of layers) for (const key of KEYS) if (!out[key] && layer[key]) out[key] = layer[key];
  return out;
}
