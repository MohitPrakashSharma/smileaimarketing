import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * The full technical report is never downloaded by a visitor. They request it
 * through the existing consultation form; our team contacts them and shares
 * the PDF by hand. This module holds the pieces every surface shares: the
 * public copy, the consultation URLs the report/PDF link to, and the booking
 * helper that records the request on the Appointment row.
 */

export const TECHNICAL_REPORT_LOCKED_MESSAGE = "The full technical report is provided by our team after a website review. Use “Request Full Technical Report” on your audit page.";

/** Query flag the consultation page reads to switch into "technical report" mode. */
export const TECHNICAL_REPORT_REQUEST_PARAM = "request";
export const TECHNICAL_REPORT_REQUEST_VALUE = "technical-report";

/** Consultation page for an existing audit. The public token is the same unguessable reference the visitor already holds in their report URL — no other data travels in the query. */
export function consultationUrl(base: string, publicToken: string): string {
  return `${base.replace(/\/$/, "")}/book-consultation?publicToken=${encodeURIComponent(publicToken)}`;
}

export function technicalReportRequestUrl(base: string, publicToken: string): string {
  return `${consultationUrl(base, publicToken)}&${TECHNICAL_REPORT_REQUEST_PARAM}=${TECHNICAL_REPORT_REQUEST_VALUE}`;
}

/** Confirmation shown after the consultation form when the technical report was requested. Deliberately does not promise a confirmed meeting or an automatic PDF. */
export const TECHNICAL_REPORT_REQUEST_CONFIRMATION = "Thank you for requesting the full technical report. Our team will contact you to discuss your website audit and provide the detailed report.";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Finds an open technical-report request for this audit so a second submission
 * (double click, page refresh, a second booking attempt) does not create a
 * second lead record. Open = still REQUESTED or SCHEDULED and not yet DELIVERED.
 */
export async function findOpenTechnicalReportRequest(db: Db, auditId: string) {
  return db.appointment.findFirst({
    where: { auditId, technicalReportStatus: { in: ["PENDING", "CONTACTED"] }, status: { in: ["REQUESTED", "SCHEDULED"] } },
    orderBy: { createdAt: "desc" },
  });
}

/** Data merged into an Appointment create when the booking asked for the technical report. */
export function technicalReportRequestData(requested: boolean): Pick<Prisma.AppointmentUncheckedCreateInput, "technicalReportStatus" | "technicalReportRequestedAt"> {
  return requested ? { technicalReportStatus: "PENDING", technicalReportRequestedAt: new Date() } : {};
}
