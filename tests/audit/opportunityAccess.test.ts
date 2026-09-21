import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Access control and privacy for the financial-opportunity inputs:
 *   - the admin endpoint refuses anonymous callers and validates what it stores
 *   - the public report API exposes only the derived scenario, never the raw stored inputs
 */
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-jwt-secret-test-jwt-secret-test";
process.env.CRON_SECRET ??= "test-cron-secret-test-cron-secret-0000";
process.env.WEBHOOK_SECRET ??= "test-webhook-secret-test-webhook-0000";
process.env.APP_BASE_URL ??= "http://localhost:3000";

const db = { audit: { findUnique: vi.fn(), update: vi.fn() } };
vi.mock("@/lib/prisma", () => ({ prisma: db }));
const session = { current: null as null | { id: string; email: string; role: string } };
vi.mock("@/lib/auth", () => ({ getAdminSession: vi.fn(async () => session.current) }));

const { GET, PUT, DELETE } = await import("@/app/api/admin/audits/[id]/opportunity-inputs/route");
const { buildV2Payload } = await import("@/lib/audit/report");

const params = Promise.resolve({ id: "audit-1" });
const req = (method: string, body?: unknown) => new Request("http://localhost/api/admin/audits/audit-1/opportunity-inputs", { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const baseAudit = { id: "audit-1", engine: "CRAWL_V2", status: "COMPLETED", summaryJson: null as unknown };

describe("opportunity inputs — access and validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.current = null;
    db.audit.findUnique.mockResolvedValue({ ...baseAudit });
    db.audit.update.mockImplementation(async ({ data }: { data: { summaryJson: unknown } }) => ({ summaryJson: data.summaryJson }));
  });

  it("refuses anonymous callers on every method and never touches the database", async () => {
    for (const call of [() => GET(req("GET"), { params }), () => PUT(req("PUT", { contribution: { value: 500, source: "finance" } }), { params }), () => DELETE(req("DELETE"), { params })]) {
      const res = await call();
      expect(res.status).toBe(401);
    }
    expect(db.audit.findUnique).not.toHaveBeenCalled();
    expect(db.audit.update).not.toHaveBeenCalled();
  });

  it("stores validated inputs for an admin, marks the PDF stale, and returns the derived scenario", async () => {
    session.current = { id: "u1", email: "admin@test", role: "ADMIN" };
    const res = await PUT(req("PUT", { monthlyVisitors: { value: 1000, source: "ga4", period: "Aug 2026", label: "GA4 sessions" }, currentRate: { value: 0.02, source: "ga4", period: "Aug 2026" }, patientRate: { value: 0.5, source: "crm" }, contribution: { value: 400, source: "finance", period: "FY2025" } }), { params });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scenario.mode).toBe("verified");
    expect(json.scenario.figures.monthlyContribution).toBeCloseTo(4000);
    const update = db.audit.update.mock.calls[0][0];
    expect(update.data.pdfStatus).toBe("NOT_REQUESTED");
    expect(update.data.summaryJson.opportunityInputs.monthlyVisitors.value).toBe(1000);
  });

  it("rejects percentages given as whole numbers, unknown sources and non-numbers", async () => {
    session.current = { id: "u1", email: "admin@test", role: "SUPERADMIN" };
    const res = await PUT(req("PUT", { currentRate: { value: 2, source: "ga4" } }), { params });
    expect(res.status).toBe(400);
    const res2 = await PUT(req("PUT", { monthlyVisitors: { value: 1000, source: "pagespeed" } }), { params });
    expect(res2.status).toBe(400);
    const res3 = await PUT(req("PUT", { contribution: { value: "lots", source: "finance" } }), { params });
    expect(res3.status).toBe(400);
    expect(db.audit.update).not.toHaveBeenCalled();
  });

  it("clears inputs on DELETE and falls back to the illustrative scenario", async () => {
    session.current = { id: "u1", email: "admin@test", role: "ADMIN" };
    db.audit.findUnique.mockResolvedValue({ ...baseAudit, summaryJson: { opportunityInputs: { contribution: { value: 400, source: "finance" } } } });
    const res = await DELETE(req("DELETE"), { params });
    const json = await res.json();
    expect(json.inputs).toBeNull();
    expect(json.scenario.mode).toBe("illustrative");
  });
});

describe("public report payload privacy", () => {
  it("exposes only the derived scenario — the raw stored inputs and their labels are summarised, not copied", () => {
    const audit = { id: "a", publicToken: "tok", status: "COMPLETED", engine: "CRAWL_V2", summaryJson: { opportunityInputs: { monthlyVisitors: { value: 1000, source: "ga4", label: "GA4 property 123456 — internal note", period: "Aug 2026" } }, localComparisonNarrative: null }, score: 60, technicalScore: 60, contentScore: 60, performanceScore: null, searchScore: null, localScore: null, scoreBreakdownJson: null, crawlStatsJson: null, progressJson: null, summaryText: null, createdAt: new Date(), completedAt: new Date(), configJson: null } as never;
    const payload = buildV2Payload(audit, [], [], [], [], [], [], { name: "P", website: "https://p.test", city: "Toronto" });
    const json = JSON.stringify(payload);
    // The scenario carries the value and a label, but nothing outside `opportunity` leaks the stored object
    expect(payload.opportunity.mode).toBe("partial");
    expect(json).not.toContain("opportunityInputs");
    expect((payload as unknown as Record<string, unknown>).summaryJson).toBeUndefined();
  });
});
