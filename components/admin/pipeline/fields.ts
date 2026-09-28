import type { FieldKey, FilterCondition, GroupKey, Operator, ViewConfig } from "@/lib/pipelineViews";
import { STAGES, daysSince, type PipelineLead } from "@/components/admin/pipeline/shared";

/*
 * The pipeline's field registry: how each filterable/sortable/groupable field
 * reads off a lead, what type it is, and which operators apply. Filtering,
 * sorting and grouping all run client-side over the loaded leads.
 */

export type FieldType = "text" | "enum" | "number" | "date" | "bool";
type Value = string | number | boolean | null;

export type FieldDef = {
  label: string;
  type: FieldType;
  get: (lead: PipelineLead) => Value;
  options?: { value: string; label: string }[];
  /** Unit shown next to number inputs. */
  unit?: string;
};

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

export const FIELDS: Record<FieldKey, FieldDef> = {
  name: { label: "Practice name", type: "text", get: (l) => l.name },
  stage: { label: "Stage", type: "enum", get: (l) => l.status, options: STAGES.map((s) => ({ value: s.value, label: s.label })) },
  city: { label: "City", type: "text", get: (l) => l.city || null },
  province: { label: "Province / state", type: "text", get: (l) => l.state || null },
  country: { label: "Country", type: "text", get: (l) => l.country || null },
  opportunityScore: { label: "Opportunity score", type: "number", get: (l) => l.opportunityScore },
  auditScore: { label: "Audit score", type: "number", get: (l) => (l.audit?.status === "COMPLETED" ? l.audit.score : null) },
  auditStatus: {
    label: "Audit status",
    type: "enum",
    get: (l) => l.audit?.status ?? null,
    options: ["PENDING", "RUNNING", "COMPLETED", "FAILED"].map((v) => ({ value: v, label: title(v) })),
  },
  hasContact: { label: "Has contact", type: "bool", get: (l) => Boolean(l.contact) },
  outreachStatus: {
    label: "Outreach status",
    type: "enum",
    get: (l) => l.outreachStatus,
    options: ["QUEUED", "SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED", "BOUNCED"].map((v) => ({ value: v, label: title(v) })),
  },
  dealValue: { label: "Deal value", type: "number", unit: "CAD", get: (l) => (l.dealValueCents != null ? l.dealValueCents / 100 : null) },
  createdAt: { label: "Date added", type: "date", get: (l) => l.createdAt },
  updatedAt: { label: "Last activity", type: "date", get: (l) => l.updatedAt },
};

export const OPERATOR_LABELS: Record<Operator, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
  not_contains: "doesn't contain",
  in: "is any of",
  not_in: "is none of",
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  between: "is between",
  last_days: "in the last",
  older_days: "more than … ago",
  before: "is before",
  after: "is after",
  is_true: "is yes",
  is_false: "is no",
  empty: "is unknown",
  not_empty: "is known",
};

export const OPERATORS_BY_TYPE: Record<FieldType, Operator[]> = {
  text: ["is", "is_not", "contains", "not_contains", "empty", "not_empty"],
  enum: ["in", "not_in", "empty", "not_empty"],
  number: ["gte", "lte", "gt", "lt", "eq", "neq", "between", "empty", "not_empty"],
  date: ["last_days", "older_days", "after", "before"],
  bool: ["is_true", "is_false"],
};

/** Operators that need no value. */
export const VALUELESS: Operator[] = ["empty", "not_empty", "is_true", "is_false"];

export function defaultCondition(field: FieldKey): FilterCondition {
  const type = FIELDS[field].type;
  const op = OPERATORS_BY_TYPE[type][0];
  const value = type === "enum" ? [] : type === "number" ? undefined : type === "date" ? 7 : type === "text" ? "" : undefined;
  return { id: Math.random().toString(36).slice(2, 10), field, op, value };
}

export function isComplete(c: FilterCondition): boolean {
  if (VALUELESS.includes(c.op)) return true;
  const v = c.value;
  if (v === undefined || v === "") return false;
  if (Array.isArray(v)) return v.length > 0 && (c.op !== "between" || v.every((n) => typeof n === "number" && !Number.isNaN(n)));
  if (typeof v === "number") return !Number.isNaN(v);
  return true;
}

function matches(lead: PipelineLead, c: FilterCondition, now: number): boolean {
  const raw = FIELDS[c.field].get(lead);
  const empty = raw === null || raw === "";
  switch (c.op) {
    case "empty":
      return empty;
    case "not_empty":
      return !empty;
    case "is_true":
      return raw === true;
    case "is_false":
      return raw === false;
  }
  if (empty) return false;
  const v = c.value;
  switch (c.op) {
    case "is":
      return String(raw).toLowerCase() === String(v).trim().toLowerCase();
    case "is_not":
      return String(raw).toLowerCase() !== String(v).trim().toLowerCase();
    case "contains":
      return String(raw).toLowerCase().includes(String(v).trim().toLowerCase());
    case "not_contains":
      return !String(raw).toLowerCase().includes(String(v).trim().toLowerCase());
    case "in":
      return Array.isArray(v) && (v as string[]).includes(String(raw));
    case "not_in":
      return Array.isArray(v) && !(v as string[]).includes(String(raw));
    case "eq":
      return Number(raw) === Number(v);
    case "neq":
      return Number(raw) !== Number(v);
    case "gt":
      return Number(raw) > Number(v);
    case "gte":
      return Number(raw) >= Number(v);
    case "lt":
      return Number(raw) < Number(v);
    case "lte":
      return Number(raw) <= Number(v);
    case "between": {
      const [lo, hi] = v as [number, number];
      return Number(raw) >= Math.min(lo, hi) && Number(raw) <= Math.max(lo, hi);
    }
    case "last_days":
      return daysSince(String(raw), now) <= Number(v);
    case "older_days":
      return daysSince(String(raw), now) > Number(v);
    case "before":
      return new Date(String(raw)).getTime() < new Date(String(v)).getTime();
    case "after":
      return new Date(String(raw)).getTime() > new Date(String(v)).getTime();
    default:
      return true;
  }
}

const isBlank = (v: Value) => v === null || v === "";

/** Typed comparison of two known values. */
function compareKnown(a: Value, b: Value, type: FieldType): number {
  if (type === "date") return new Date(String(a)).getTime() - new Date(String(b)).getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

const STAGE_ORDER = new Map<string, number>(STAGES.map((s, i) => [s.value, i]));

/** Search → filters → sort, exactly as the view config describes. */
export function applyView(leads: PipelineLead[], config: ViewConfig): PipelineLead[] {
  const now = Date.now();
  const q = config.search.trim().toLowerCase();
  const active = config.filters.filter(isComplete);

  const out = leads.filter((l) => {
    if (q && !`${l.name} ${l.city} ${l.state ?? ""} ${l.contact?.name ?? ""} ${l.contact?.email ?? ""}`.toLowerCase().includes(q)) return false;
    if (active.length === 0) return true;
    return config.match === "all" ? active.every((c) => matches(l, c, now)) : active.some((c) => matches(l, c, now));
  });

  return out.sort((a, b) => {
    for (const s of config.sort) {
      const va = s.field === "stage" ? (STAGE_ORDER.get(a.status) ?? 0) : FIELDS[s.field].get(a);
      const vb = s.field === "stage" ? (STAGE_ORDER.get(b.status) ?? 0) : FIELDS[s.field].get(b);
      // Unknown values sort last whichever direction is chosen.
      if (isBlank(va) || isBlank(vb)) {
        if (isBlank(va) && isBlank(vb)) continue;
        return isBlank(va) ? 1 : -1;
      }
      const r = compareKnown(va, vb, s.field === "stage" ? "number" : FIELDS[s.field].type);
      if (r !== 0) return s.dir === "asc" ? r : -r;
    }
    return 0;
  });
}

export const GROUP_LABELS: Record<GroupKey, string> = {
  stage: "Stage",
  city: "City",
  province: "Province / state",
  country: "Country",
  auditStatus: "Audit status",
  outreachStatus: "Outreach status",
  hasContact: "Has contact",
};

export type LeadGroup = { key: string; label: string; leads: PipelineLead[]; dot?: string };

/** Split already-sorted leads into groups; stage groups follow pipeline order and include empty stages. */
export function groupLeads(leads: PipelineLead[], groupBy: GroupKey): LeadGroup[] {
  if (groupBy === "stage") {
    return STAGES.map((s) => ({ key: s.value, label: s.label, dot: s.dot, leads: leads.filter((l) => l.status === s.value) }));
  }
  const field = FIELDS[groupBy];
  const map = new Map<string, PipelineLead[]>();
  for (const l of leads) {
    const raw = field.get(l);
    const key = raw === null || raw === "" ? "" : String(raw);
    map.set(key, [...(map.get(key) ?? []), l]);
  }
  const label = (key: string) => {
    if (key === "") return "Unknown";
    if (field.type === "bool") return key === "true" ? "Yes" : "No";
    return field.options?.find((o) => o.value === key)?.label ?? key;
  };
  return [...map.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)))
    .map(([key, ls]) => ({ key: key || "__unknown", label: label(key), leads: ls }));
}

/** Short human summary of a condition, for chips: "Stage is any of Auditing, Audited". */
export function describeCondition(c: FilterCondition): string {
  const f = FIELDS[c.field];
  const op = OPERATOR_LABELS[c.op];
  if (VALUELESS.includes(c.op)) return `${f.label} ${op}`;
  const v = c.value;
  let value: string;
  if (Array.isArray(v) && c.op !== "between") value = (v as string[]).map((x) => f.options?.find((o) => o.value === x)?.label ?? x).join(", ");
  else if (c.op === "between" && Array.isArray(v)) value = `${v[0]} and ${v[1]}`;
  else value = String(v ?? "");
  if (c.op === "last_days") return `${f.label} in the last ${value} days`;
  if (c.op === "older_days") return `${f.label} more than ${value} days ago`;
  return `${f.label} ${op} ${value}${f.unit && typeof v === "number" ? ` ${f.unit}` : ""}`;
}
