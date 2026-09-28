import { z } from "zod";

/*
 * Saved views for /admin/pipeline. A view is a name plus a ViewConfig; the
 * config is validated here on every write so a malformed JSON blob can never
 * reach the client. Shared by the API routes and the pipeline UI.
 */

export const VIEW_TYPES = ["board", "table", "list", "summary"] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const FIELD_KEYS = [
  "name",
  "stage",
  "city",
  "province",
  "country",
  "opportunityScore",
  "auditScore",
  "auditStatus",
  "hasContact",
  "outreachStatus",
  "dealValue",
  "createdAt",
  "updatedAt",
] as const;
export type FieldKey = (typeof FIELD_KEYS)[number];

export const OPERATORS = [
  // text
  "is",
  "is_not",
  "contains",
  "not_contains",
  // enum (value: string[])
  "in",
  "not_in",
  // number
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  // date
  "last_days",
  "older_days",
  "before",
  "after",
  // boolean
  "is_true",
  "is_false",
  // any
  "empty",
  "not_empty",
] as const;
export type Operator = (typeof OPERATORS)[number];

export const GROUP_KEYS = ["stage", "city", "province", "country", "auditStatus", "outreachStatus", "hasContact"] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const COLUMN_KEYS = [
  "stage",
  "opportunityScore",
  "auditScore",
  "auditStatus",
  "contact",
  "outreachStatus",
  "city",
  "province",
  "country",
  "dealValue",
  "createdAt",
  "updatedAt",
] as const;
export type ColumnKey = (typeof COLUMN_KEYS)[number];

export const PAGE_SIZES = [10, 25, 50, 100] as const;

const conditionSchema = z.object({
  id: z.string().min(1).max(64),
  field: z.enum(FIELD_KEYS),
  op: z.enum(OPERATORS),
  value: z
    .union([z.string().max(200), z.number(), z.array(z.string().max(100)).max(50), z.tuple([z.number(), z.number()])])
    .optional(),
});
export type FilterCondition = z.infer<typeof conditionSchema>;

export const viewConfigSchema = z.object({
  type: z.enum(VIEW_TYPES),
  search: z.string().max(200),
  match: z.enum(["all", "any"]),
  filters: z.array(conditionSchema).max(20),
  sort: z.array(z.object({ field: z.enum(FIELD_KEYS), dir: z.enum(["asc", "desc"]) })).max(3),
  groupBy: z.enum(GROUP_KEYS).nullable(),
  columns: z.array(z.enum(COLUMN_KEYS)).max(COLUMN_KEYS.length),
  pageSize: z.number().int().min(5).max(200),
});
export type ViewConfig = z.infer<typeof viewConfigSchema>;

export const DEFAULT_COLUMNS: ColumnKey[] = ["stage", "opportunityScore", "auditScore", "contact", "dealValue", "updatedAt"];

export const DEFAULT_CONFIG: ViewConfig = {
  type: "board",
  search: "",
  match: "all",
  filters: [],
  sort: [{ field: "updatedAt", dir: "desc" }],
  groupBy: null,
  columns: DEFAULT_COLUMNS,
  pageSize: 25,
};

/** Fill any missing keys from DEFAULT_CONFIG, then validate. Returns null if unusable. */
export function parseViewConfig(input: unknown): ViewConfig | null {
  const merged = typeof input === "object" && input !== null ? { ...DEFAULT_CONFIG, ...input } : input;
  const result = viewConfigSchema.safeParse(merged);
  return result.success ? result.data : null;
}

const OPEN: FilterCondition = { id: "open", field: "stage", op: "not_in", value: ["CONVERTED", "DISQUALIFIED"] };

const cfg = (partial: Partial<ViewConfig>): ViewConfig => ({ ...DEFAULT_CONFIG, ...partial });

/**
 * Created once per admin the first time they open the pipeline. After that they
 * are ordinary rows — rename, edit or delete them freely; they won't come back.
 */
export const STARTER_VIEWS: { name: string; config: ViewConfig }[] = [
  { name: "All Leads", config: cfg({}) },
  {
    name: "New Leads",
    config: cfg({
      type: "table",
      filters: [{ id: "new", field: "stage", op: "in", value: ["DISCOVERED", "QUALIFIED"] }],
      sort: [{ field: "createdAt", dir: "desc" }],
    }),
  },
  {
    name: "High Priority",
    config: cfg({
      type: "table",
      filters: [{ id: "score", field: "opportunityScore", op: "gte", value: 60 }, OPEN],
      sort: [{ field: "opportunityScore", dir: "desc" }],
    }),
  },
  {
    name: "Needs Follow-up",
    config: cfg({
      type: "list",
      groupBy: "stage",
      filters: [{ id: "stale", field: "updatedAt", op: "older_days", value: 14 }, OPEN],
      sort: [{ field: "updatedAt", dir: "asc" }],
    }),
  },
  { name: "Auditing", config: cfg({ type: "table", filters: [{ id: "st", field: "stage", op: "in", value: ["AUDITING"] }] }) },
  {
    name: "Pending Approval",
    config: cfg({ type: "table", filters: [{ id: "st", field: "stage", op: "in", value: ["OUTREACH_PENDING"] }] }),
  },
  {
    name: "Won",
    config: cfg({
      type: "table",
      filters: [{ id: "st", field: "stage", op: "in", value: ["CONVERTED"] }],
      sort: [{ field: "dealValue", dir: "desc" }],
    }),
  },
  { name: "Lost", config: cfg({ type: "table", filters: [{ id: "st", field: "stage", op: "in", value: ["DISQUALIFIED"] }] }) },
  {
    name: "Canadian Practices",
    config: cfg({ type: "table", groupBy: "province", filters: [{ id: "ca", field: "country", op: "is", value: "CA" }] }),
  },
  {
    name: "Ontario Practices",
    config: cfg({
      type: "table",
      groupBy: "city",
      filters: [
        { id: "ca", field: "country", op: "is", value: "CA" },
        { id: "on", field: "province", op: "is", value: "ON" },
      ],
    }),
  },
  {
    name: "High Audit Score",
    config: cfg({
      type: "table",
      filters: [{ id: "audit", field: "auditScore", op: "gte", value: 70 }],
      sort: [{ field: "auditScore", dir: "desc" }],
    }),
  },
  {
    name: "Recently Added",
    config: cfg({
      type: "table",
      filters: [{ id: "recent", field: "createdAt", op: "last_days", value: 7 }],
      sort: [{ field: "createdAt", dir: "desc" }],
    }),
  },
];

export type PipelineViewDTO = {
  id: string;
  name: string;
  shared: boolean;
  position: number;
  config: ViewConfig;
  /** True when the signed-in admin can edit/delete it (they own it). */
  editable: boolean;
  ownerName: string;
};
