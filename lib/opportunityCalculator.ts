/**
 * Missed-opportunity calculator (homepage). Pure functions, no I/O: the
 * visitor's numbers stay in component state and are never stored or tracked.
 *
 * Every result is a hypothetical improvement scenario built only from what the
 * visitor typed — not a measured loss and not a benchmark.
 */

export type OpportunityInputs = {
  monthlyVisitors: string;
  currentRate: string; // % of visitors that enquire today
  targetRate: string; // % of visitors that could enquire
  patientRate: string; // % of enquiries that become patients
  contribution: string; // CAD per new patient
};

export type OpportunityField = keyof OpportunityInputs;

export type OpportunityResult = {
  additionalEnquiries: number;
  additionalPatients: number;
  monthlyContribution: number;
  dailyContribution: number;
  /** True when the target rate is not above the current rate (no uplift to show). */
  noUplift: boolean;
};

export const EMPTY_INPUTS: OpportunityInputs = {
  monthlyVisitors: "",
  currentRate: "",
  targetRate: "",
  patientRate: "",
  contribution: "",
};

/**
 * Clearly labelled illustrative numbers for trying the calculator. They are
 * not benchmarks and say nothing about any real practice.
 */
export const ILLUSTRATIVE_INPUTS: OpportunityInputs = {
  monthlyVisitors: "1200",
  currentRate: "2",
  targetRate: "4",
  patientRate: "40",
  contribution: "600",
};

const LIMITS: Record<OpportunityField, { min: number; max: number; label: string }> = {
  monthlyVisitors: { min: 0, max: 10_000_000, label: "Monthly visitors" },
  currentRate: { min: 0, max: 100, label: "Current enquiry rate" },
  targetRate: { min: 0, max: 100, label: "Target enquiry rate" },
  patientRate: { min: 0, max: 100, label: "Enquiry-to-patient rate" },
  contribution: { min: 0, max: 1_000_000, label: "Contribution per patient" },
};

const PERCENT_FIELDS: OpportunityField[] = ["currentRate", "targetRate", "patientRate"];

/** Parse one field. Returns the number, or an error message for the visitor. */
export function parseField(field: OpportunityField, raw: string): { value: number | null; error: string | null } {
  const text = raw.replace(/[,\s$%]/g, "").trim();
  if (text === "") return { value: null, error: null }; // blank is allowed, just incomplete
  const n = Number(text);
  const { min, max } = LIMITS[field];
  if (!Number.isFinite(n)) return { value: null, error: "Enter a number." };
  if (n < min) return { value: null, error: "Can't be negative." };
  if (n > max) return { value: null, error: PERCENT_FIELDS.includes(field) ? "Must be between 0 and 100." : "That looks too large." };
  return { value: n, error: null };
}

export function validateInputs(inputs: OpportunityInputs): {
  values: Partial<Record<OpportunityField, number>>;
  errors: Partial<Record<OpportunityField, string>>;
  complete: boolean;
} {
  const values: Partial<Record<OpportunityField, number>> = {};
  const errors: Partial<Record<OpportunityField, string>> = {};
  (Object.keys(inputs) as OpportunityField[]).forEach((field) => {
    const { value, error } = parseField(field, inputs[field]);
    if (error) errors[field] = error;
    if (value !== null) values[field] = value;
  });
  const complete = Object.keys(errors).length === 0 && (Object.keys(LIMITS) as OpportunityField[]).every((f) => values[f] !== undefined);
  return { values, errors, complete };
}

/**
 * additional enquiries  = visitors × max(0, target − current)
 * additional patients   = additional enquiries × enquiry-to-patient rate
 * monthly contribution  = additional patients × contribution per patient
 * daily contribution    = monthly contribution ÷ 30
 */
export function computeOpportunity(v: Record<OpportunityField, number>): OpportunityResult {
  const uplift = Math.max(0, v.targetRate - v.currentRate) / 100;
  const additionalEnquiries = v.monthlyVisitors * uplift;
  const additionalPatients = additionalEnquiries * (v.patientRate / 100);
  const monthlyContribution = additionalPatients * v.contribution;
  return {
    additionalEnquiries,
    additionalPatients,
    monthlyContribution,
    dailyContribution: monthlyContribution / 30,
    noUplift: uplift === 0,
  };
}
