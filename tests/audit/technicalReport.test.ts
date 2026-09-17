import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * The technical report is never served to a visitor. These tests exercise the
 * real route handlers with a mocked database: the public token route refuses
 * every non-customer variant before touching the database, the admin route is
 * the only path to the technical PDF and needs a session, and a consultation
 * submitted from "Request Full Technical Report" records the request on the
 * Appointment linked to the audit — without returning or sending any PDF.
 */

// The route modules import lib/env.server transitively; give it a valid shape without touching a real database.
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret";
process.env.CRON_SECRET ??= "test-cron-secret";
process.env.WEBHOOK_SECRET ??= "test-webhook-secret";
process.env.APP_BASE_URL ??= "http://localhost:3000";
vi.mock("@/lib/pdfGenerator", () => ({ generateLightAuditPdf: vi.fn() }));
vi.mock("@/lib/queue", () => ({ auditQueue: { add: vi.fn() }, pdfQueue: { add: vi.fn() } }));

const db = {
  audit: { findUnique: vi.fn(), update: vi.fn() },
  appointment: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  business: { update: vi.fn() },
  salesActivity: { create: vi.fn() },
  user: { findFirst: vi.fn() },
};
vi.mock("@/lib/prisma", () => ({ prisma: db }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn(async () => undefined) }));
vi.mock("@/lib/googleCalendar", () => ({ createGoogleMeetEvent: vi.fn(async () => ({ status: "UNAVAILABLE" })) }));
const session = { current: null as null | { id: string; email: string; role: string } };
vi.mock("@/lib/auth", () => ({ getAdminSession: vi.fn(async () => session.current) }));

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "smileai-pdf-"));
const customerFile = path.join(tmp, "customer.pdf");
const technicalFile = path.join(tmp, "technical.pdf");
await fs.writeFile(customerFile, "%PDF-1.4 customer");
await fs.writeFile(technicalFile, "%PDF-1.4 technical");
const gen = { generateV2AuditPdf: vi.fn(async (_id: string, kind: string) => (kind === "technical" ? "private:technical.pdf" : "private:customer.pdf")) };
vi.mock("@/lib/audit/pdf/generate", () => ({
  generateV2AuditPdf: (...a: [string, string]) => gen.generateV2AuditPdf(...a),
  customerPdfIsCurrent: () => true,
  technicalPdfIfCurrent: async () => "private:technical.pdf",
  resolvePdfPath: (stored: string) => (stored.endsWith("technical.pdf") ? technicalFile : customerFile),
  downloadFileName: (name: string, _d: Date, kind = "customer") => `${name.toLowerCase().replace(/\s+/g, "-")}${kind === "technical" ? "-technical-report" : ""}.pdf`,
}));

const { GET: publicPdf } = await import("@/app/api/audit/[publicToken]/pdf/route");
const { GET: adminPdf } = await import("@/app/api/admin/audits/[id]/technical-pdf/route");
const { POST: bookMeeting } = await import("@/app/api/audit/[publicToken]/book-meeting/route");
const { POST: requestVisit } = await import("@/app/api/audit/[publicToken]/request-visit/route");
const { technicalReportRequestUrl, consultationUrl, TECHNICAL_REPORT_REQUEST_CONFIRMATION } = await import("@/lib/audit/technicalReport");

const TOKEN = "11111111-2222-3333-4444-555555555555";
const audit = {
  id: "audit-1",
  publicToken: TOKEN,
  businessId: "biz-1",
  engine: "CRAWL_V2",
  status: "COMPLETED",
  completedAt: new Date("2026-09-16T10:00:00Z"),
  createdAt: new Date("2026-09-16T09:00:00Z"),
  pdfStatus: "READY",
  pdfUrl: "private:customer.pdf",
  pdfGeneratedAt: new Date("2026-09-16T10:05:00Z"),
  business: { id: "biz-1", name: "Thin Dental Studio", website: "https://thin.test", city: "Toronto", contacts: [{ id: "contact-1", email: "owner@thin.test" }] },
  results: [],
  competitorGaps: [],
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const params = (v: Record<string, string>) => ({ params: Promise.resolve(v) }) as any;

beforeEach(() => {
  vi.clearAllMocks();
  session.current = null;
  db.audit.findUnique.mockResolvedValue(audit);
  db.appointment.findFirst.mockResolvedValue(null);
  db.appointment.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "appt-1", status: "REQUESTED", meetLink: null, ...data }));
  db.user.findFirst.mockResolvedValue({ id: "user-1" });
});

describe("public PDF route", () => {
  it("serves the free customer PDF to whoever holds the public token", async () => {
    const res = await publicPdf(new Request(`http://localhost/api/audit/${TOKEN}/pdf`), params({ publicToken: TOKEN }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("thin-dental-studio.pdf");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toContain("customer");
  });

  it.each(["technical", "TECHNICAL", " technical ", "Technical", "tech", "internal", "developer", "customer2"])("refuses ?variant=%j without touching the database or generating anything", async (variant) => {
    const res = await publicPdf(new Request(`http://localhost/api/audit/${TOKEN}/pdf?variant=${encodeURIComponent(variant)}`), params({ publicToken: TOKEN }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/provided by our team/);
    expect(db.audit.findUnique).not.toHaveBeenCalled();
    expect(gen.generateV2AuditPdf).not.toHaveBeenCalled();
  });

  it("still refuses the technical variant when the caller is an admin — the public route never serves it", async () => {
    session.current = { id: "admin", email: "a@b.c", role: "ADMIN" };
    const res = await publicPdf(new Request(`http://localhost/api/audit/${TOKEN}/pdf?variant=technical`), params({ publicToken: TOKEN }));
    expect(res.status).toBe(403);
  });

  it("treats an explicit ?variant=customer like the default", async () => {
    const res = await publicPdf(new Request(`http://localhost/api/audit/${TOKEN}/pdf?variant=customer`), params({ publicToken: TOKEN }));
    expect(res.status).toBe(200);
  });
});

describe("admin technical PDF route", () => {
  it("requires an admin session", async () => {
    const res = await adminPdf(new Request("http://localhost/api/admin/audits/audit-1/technical-pdf"), params({ id: "audit-1" }));
    expect(res.status).toBe(401);
    expect(db.audit.findUnique).not.toHaveBeenCalled();
    expect(gen.generateV2AuditPdf).not.toHaveBeenCalled();
  });

  it("serves the technical PDF to an admin, keyed by audit id", async () => {
    session.current = { id: "admin", email: "a@b.c", role: "ADMIN" };
    const res = await adminPdf(new Request("http://localhost/api/admin/audits/audit-1/technical-pdf"), params({ id: "audit-1" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("technical-report");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(Buffer.from(await res.arrayBuffer()).toString()).toContain("technical");
  });

  it("refuses when the session role is not an admin role", async () => {
    // getAdminSession itself returns null for non-admin roles; here it returns null → 401
    const res = await adminPdf(new Request("http://localhost/api/admin/audits/audit-1/technical-pdf"), params({ id: "audit-1" }));
    expect(res.status).toBe(401);
  });
});

describe("technical-report request through the existing consultation booking", () => {
  const post = (body: unknown) => new Request(`http://localhost/api/audit/${TOKEN}/book-meeting`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  it("records the request on an Appointment linked to the audit, status PENDING, and returns no PDF", async () => {
    const res = await bookMeeting(post({ scheduledTime: "2026-10-01T15:00:00.000Z", notes: "Please bring the report", technicalReport: true }), params({ publicToken: TOKEN }));
    expect(res.status).toBe(200);
    const created = db.appointment.create.mock.calls[0][0].data;
    expect(created.auditId).toBe("audit-1");
    expect(created.businessId).toBe("biz-1");
    expect(created.contactId).toBe("contact-1");
    expect(created.technicalReportStatus).toBe("PENDING");
    expect(created.technicalReportRequestedAt).toBeInstanceOf(Date);
    const body = await res.json();
    expect(body.technicalReportStatus).toBe("PENDING");
    expect(JSON.stringify(body)).not.toMatch(/pdf|technical-pdf|\.pdf/i);
    expect(gen.generateV2AuditPdf).not.toHaveBeenCalled(); // nothing is generated or delivered automatically
    const note = db.salesActivity.create.mock.calls[0][0].data.content;
    expect(note).toMatch(/requested the full technical report/);
  });

  it("an ordinary booking is still linked to the audit but carries no technical-report status", async () => {
    await bookMeeting(post({ scheduledTime: "2026-10-01T15:00:00.000Z" }), params({ publicToken: TOKEN }));
    const created = db.appointment.create.mock.calls[0][0].data;
    expect(created.auditId).toBe("audit-1");
    expect(created.technicalReportStatus).toBeUndefined();
  });

  it("reuses an open request instead of creating a duplicate on a repeated submission", async () => {
    db.appointment.findFirst.mockResolvedValue({ id: "appt-open", status: "REQUESTED", meetLink: null, technicalReportStatus: "PENDING" });
    const res = await bookMeeting(post({ scheduledTime: "2026-10-01T15:00:00.000Z", technicalReport: true }), params({ publicToken: TOKEN }));
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(body.appointmentId).toBe("appt-open");
    expect(db.appointment.create).not.toHaveBeenCalled();
  });

  it("in-person visit requests record the same status", async () => {
    const res = await requestVisit(new Request(`http://localhost/api/audit/${TOKEN}/request-visit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: "123 Main St, Newmarket", preferredWindow: "Tuesday morning", technicalReport: true }) }), params({ publicToken: TOKEN }));
    expect(res.status).toBe(200);
    const created = db.appointment.create.mock.calls[0][0].data;
    expect(created.technicalReportStatus).toBe("PENDING");
    expect(created.auditId).toBe("audit-1");
    expect(created.type).toBe("IN_PERSON");
  });

  it("rejects a non-boolean flag", async () => {
    const res = await bookMeeting(post({ scheduledTime: "2026-10-01T15:00:00.000Z", technicalReport: "yes" }), params({ publicToken: TOKEN }));
    expect(res.status).toBe(400);
  });
});

describe("consultation links", () => {
  it("build the existing consultation page URL with only the audit's public token", () => {
    expect(consultationUrl("https://smileaimarketing.com", TOKEN)).toBe(`https://smileaimarketing.com/book-consultation?publicToken=${TOKEN}`);
    expect(technicalReportRequestUrl("https://smileaimarketing.com/", TOKEN)).toBe(`https://smileaimarketing.com/book-consultation?publicToken=${TOKEN}&request=technical-report`);
    expect(technicalReportRequestUrl("", TOKEN)).toBe(`/book-consultation?publicToken=${TOKEN}&request=technical-report`);
  });
  it("confirmation copy never promises a confirmed meeting or an automatic report", () => {
    expect(TECHNICAL_REPORT_REQUEST_CONFIRMATION).toMatch(/Our team will contact you/);
    expect(TECHNICAL_REPORT_REQUEST_CONFIRMATION).not.toMatch(/confirmed|attached|download|sent to your inbox/i);
  });
});
