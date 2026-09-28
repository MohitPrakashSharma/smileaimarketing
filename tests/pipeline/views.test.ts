import { describe, expect, it } from "vitest";
import { applyView, groupLeads, isComplete } from "@/components/admin/pipeline/fields";
import type { PipelineLead } from "@/components/admin/pipeline/shared";
import { DEFAULT_CONFIG, STARTER_VIEWS, parseViewConfig, type ViewConfig } from "@/lib/pipelineViews";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

function lead(p: Partial<PipelineLead> & { id: string }): PipelineLead {
  return {
    name: p.id,
    website: `https://${p.id}.ca`,
    city: "Toronto",
    state: "ON",
    country: "CA",
    status: "DISCOVERED",
    opportunityScore: 50,
    contactCount: 0,
    contact: null,
    audit: null,
    outreachStatus: null,
    dealValueCents: null,
    wonAt: null,
    createdAt: daysAgo(3),
    updatedAt: daysAgo(1),
    ...p,
  };
}

const leads = [
  lead({ id: "a", status: "AUDITING", audit: { score: 80, status: "COMPLETED" }, city: "Toronto" }),
  lead({ id: "b", status: "AUDITING", audit: { score: 60, status: "COMPLETED" }, city: "Ottawa" }),
  lead({ id: "c", status: "CONVERTED", dealValueCents: 240000, city: "Vancouver", state: "BC", updatedAt: daysAgo(30) }),
  lead({ id: "d", status: "DISQUALIFIED", city: "Seattle", state: "WA", country: "US", updatedAt: daysAgo(40) }),
  lead({ id: "e", status: "OUTREACH_ACTIVE", contact: { name: "Jo Park", email: "jo@e.ca" }, updatedAt: daysAgo(20) }),
];

const cfg = (p: Partial<ViewConfig>): ViewConfig => ({ ...DEFAULT_CONFIG, ...p });
const ids = (ls: PipelineLead[]) => ls.map((l) => l.id);

describe("applyView", () => {
  it("ANDs conditions: stage is Auditing AND audit score > 70 AND city is Toronto", () => {
    const out = applyView(
      leads,
      cfg({
        filters: [
          { id: "1", field: "stage", op: "in", value: ["AUDITING"] },
          { id: "2", field: "auditScore", op: "gt", value: 70 },
          { id: "3", field: "city", op: "is", value: "toronto" },
        ],
      })
    );
    expect(ids(out)).toEqual(["a"]);
  });

  it("ORs conditions when match is any", () => {
    const out = applyView(
      leads,
      cfg({
        match: "any",
        filters: [
          { id: "1", field: "stage", op: "in", value: ["CONVERTED"] },
          { id: "2", field: "hasContact", op: "is_true" },
        ],
        sort: [{ field: "name", dir: "asc" }],
      })
    );
    expect(ids(out)).toEqual(["c", "e"]);
  });

  it("ignores incomplete conditions instead of hiding everything", () => {
    const c = { id: "1", field: "city" as const, op: "is" as const, value: "" };
    expect(isComplete(c)).toBe(false);
    expect(applyView(leads, cfg({ filters: [c] }))).toHaveLength(leads.length);
  });

  it("handles date operators and search", () => {
    expect(ids(applyView(leads, cfg({ filters: [{ id: "1", field: "updatedAt", op: "older_days", value: 14 }], sort: [{ field: "name", dir: "asc" }] })))).toEqual([
      "c",
      "d",
      "e",
    ]);
    expect(ids(applyView(leads, cfg({ search: "jo@e" })))).toEqual(["e"]);
  });

  it("sorts with unknown values last in both directions", () => {
    const desc = applyView(leads, cfg({ sort: [{ field: "auditScore", dir: "desc" }] }));
    const asc = applyView(leads, cfg({ sort: [{ field: "auditScore", dir: "asc" }] }));
    expect(ids(desc).slice(0, 2)).toEqual(["a", "b"]);
    expect(ids(asc).slice(0, 2)).toEqual(["b", "a"]);
  });
});

describe("groupLeads", () => {
  it("groups by stage in pipeline order, keeping empty stages", () => {
    const groups = groupLeads(leads, "stage");
    expect(groups).toHaveLength(8);
    expect(groups.find((g) => g.key === "AUDITING")?.leads).toHaveLength(2);
  });

  it("groups by other fields alphabetically with Unknown last", () => {
    const groups = groupLeads([...leads, lead({ id: "f", state: null })], "province");
    expect(groups.map((g) => g.label)).toEqual(["BC", "ON", "WA", "Unknown"]);
  });
});

describe("view configs", () => {
  it("every starter view is a valid config", () => {
    for (const v of STARTER_VIEWS) expect(parseViewConfig(v.config), v.name).not.toBeNull();
  });

  it("fills missing keys from defaults and rejects junk", () => {
    expect(parseViewConfig({ type: "table" })?.pageSize).toBe(DEFAULT_CONFIG.pageSize);
    expect(parseViewConfig({ type: "spreadsheet" })).toBeNull();
    expect(parseViewConfig("nope")).toBeNull();
  });
});
