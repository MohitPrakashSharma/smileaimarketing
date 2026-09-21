import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { env, publicReportBaseUrl } from "@/lib/env.server";
import { industryFromCategory, cap } from "@/lib/industry";
import { buildV2Payload, legacyShapeFromV2 } from "../report";
import { opportunityOptionsFromEnv } from "../opportunity";
import { stageRecordFrom, COMPARISON_PENDING_TIMEOUT_MS } from "../competitors/view";
import { renderCustomerPdf, CUSTOMER_PDF_LAYOUT } from "./customerPdf";
import { renderTechnicalPdf, TECHNICAL_PDF_LAYOUT, type ReportPdfInput } from "./technicalPdf";
import { consultationUrl, technicalReportRequestUrl } from "../technicalReport";

/**
 * Builds the v2 report PDFs from stored audit rows (never re-runs anything).
 *
 * Storage: v2 PDFs are written to a private directory (`storage/reports`,
 * outside `public/`) and are only ever served through the authorised
 * download route — a guessed file name cannot bypass the report's access
 * rule. Legacy V1 PDFs keep their existing `public/reports` location and
 * `/reports/...` URLs so old links keep working.
 *
 * The audit's `pdfStatus` / `pdfUrl` / `pdfGeneratedAt` fields track the
 * customer PDF (the primary download), stored as `private:<file name>`. The
 * technical PDF is cached on disk beside it and is considered current when
 * its file is newer than the audit run. Both file names carry a layout
 * version so an older layout is regenerated on the next download.
 */

export type PdfKind = "customer" | "technical";

export const PRIVATE_REPORTS_DIR = env.REPORTS_PRIVATE_DIR ? path.resolve(env.REPORTS_PRIVATE_DIR) : path.join(process.cwd(), "storage", "reports");
export const PUBLIC_REPORTS_DIR = path.join(process.cwd(), "public", "reports");
const PRIVATE_PREFIX = "private:";

export function pdfFileName(publicToken: string, kind: PdfKind): string {
  return kind === "customer" ? `audit-${publicToken}-customer-${CUSTOMER_PDF_LAYOUT}.pdf` : `audit-${publicToken}-technical-${TECHNICAL_PDF_LAYOUT}.pdf`;
}

/** Stored `pdfUrl` → absolute path on disk (private v2 files or legacy public files). Rejects anything that escapes either directory. */
export function resolvePdfPath(stored: string): string | null {
  const base = stored.startsWith(PRIVATE_PREFIX) ? PRIVATE_REPORTS_DIR : PUBLIC_REPORTS_DIR;
  const name = stored.startsWith(PRIVATE_PREFIX) ? stored.slice(PRIVATE_PREFIX.length) : stored.replace(/^\/reports\//, "");
  if (!/^[A-Za-z0-9._-]+\.pdf$/.test(name)) return null;
  const abs = path.join(base, name);
  return abs.startsWith(base + path.sep) ? abs : null;
}

/** True when the audit's stored customer PDF is the current layout and not older than the audit run. */
export function customerPdfIsCurrent(audit: { pdfStatus: string; pdfUrl: string | null; pdfGeneratedAt: Date | null; completedAt: Date | null; publicToken: string; competitorGaps?: Array<{ measuredAt: Date | null }>; summaryJson?: unknown }, now: Date = new Date()): boolean {
  if (audit.pdfStatus !== "READY" || !audit.pdfUrl || !audit.pdfGeneratedAt) return false;
  if (audit.pdfUrl !== `${PRIVATE_PREFIX}${pdfFileName(audit.publicToken, "customer")}`) return false;
  if (audit.completedAt && audit.pdfGeneratedAt < audit.completedAt) return false;
  // The local comparison runs after the audit. While it is still queued/running the PDF omits it,
  // so the file is provisional and is re-rendered on each download until the stage reports back;
  // once it has, anything measured or finished after the render belongs in the next download.
  const stage = stageRecordFrom(audit.summaryJson);
  if (stage && (stage.status === "queued" || stage.status === "running") && now.getTime() - new Date(stage.at).getTime() <= COMPARISON_PENDING_TIMEOUT_MS) return false;
  if (stage && new Date(stage.at).getTime() > audit.pdfGeneratedAt.getTime()) return false;
  const latestMeasure = (audit.competitorGaps ?? []).map((c) => c.measuredAt?.getTime() ?? 0).reduce((a, b) => Math.max(a, b), 0);
  return latestMeasure <= audit.pdfGeneratedAt.getTime();
}

/** Customer-facing download name: "gelinas-dental-studio-seo-audit-2026-09-16.pdf" / "...-technical-report-2026-09-16.pdf" (ASCII only). */
export function downloadFileName(businessName: string, date: Date, kind: PdfKind = "customer"): string {
  const slug =
    businessName
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "website";
  const d = Number.isNaN(date.getTime()) ? new Date() : date;
  return `${slug}-seo-audit${kind === "technical" ? "-technical-report" : ""}-${d.toISOString().slice(0, 10)}.pdf`;
}

async function loadInput(auditId: string): Promise<{ input: ReportPdfInput; publicToken: string; completedAt: Date }> {
  const audit = await prisma.audit.findUnique({ where: { id: auditId }, include: { business: true } });
  if (!audit) throw new Error(`Audit ${auditId} not found`);
  if (audit.status !== "COMPLETED") throw new Error(`Audit ${auditId} is not completed`);
  const [findings, pages, checks, performance, ai, competitors] = await Promise.all([
    prisma.auditFinding.findMany({ where: { auditId } }),
    prisma.auditPage.findMany({ where: { auditId }, orderBy: { depth: "asc" } }),
    prisma.auditCheckResult.findMany({ where: { auditId } }),
    prisma.auditPerformance.findMany({ where: { auditId } }),
    prisma.auditAiPageAnalysis.findMany({ where: { auditId } }),
    prisma.competitor.findMany({ where: { auditId } }),
  ]);
  const business = audit.business;
  const ind = industryFromCategory(business.category);
  const payload = buildV2Payload(audit, findings, pages, checks, performance, ai, competitors, { name: business.name, website: business.website, city: business.city }, opportunityOptionsFromEnv());
  const legacy = legacyShapeFromV2(audit, findings, pages, { name: business.name, city: business.city, category: business.category });
  const completedAt = audit.completedAt ?? audit.createdAt;
  return {
    publicToken: audit.publicToken,
    completedAt,
    input: {
      business: { name: business.name, website: business.website, city: business.city, industryLabel: cap(ind.business), customersWord: ind.customers },
      completedAt,
      headline: legacy.narrative.headline,
      summary: audit.summaryText,
      reportUrl: `${publicReportBaseUrl()}/audit/${audit.publicToken}`,
      consultationUrl: consultationUrl(publicReportBaseUrl(), audit.publicToken),
      technicalReportRequestUrl: technicalReportRequestUrl(publicReportBaseUrl(), audit.publicToken),
      payload,
    },
  };
}

/** Renders and stores one PDF kind; returns the stored `pdfUrl`-style locator (`private:<file>`). */
export async function generateV2AuditPdf(auditId: string, kind: PdfKind = "customer"): Promise<string> {
  if (kind === "customer") await prisma.audit.update({ where: { id: auditId }, data: { pdfStatus: "GENERATING" } });
  try {
    // Stamp the PDF with the moment its data was read, not the moment the file was written: a
    // competitor measured while the render was in flight is then newer than the PDF, and the
    // next download regenerates instead of serving a file rendered without it.
    const loadedAt = new Date();
    const { input, publicToken } = await loadInput(auditId);
    const { bytes } = kind === "customer" ? await renderCustomerPdf(input) : await renderTechnicalPdf(input);
    await fs.mkdir(PRIVATE_REPORTS_DIR, { recursive: true });
    const fileName = pdfFileName(publicToken, kind);
    await fs.writeFile(path.join(PRIVATE_REPORTS_DIR, fileName), bytes);
    const stored = `${PRIVATE_PREFIX}${fileName}`;
    if (kind === "customer") await prisma.audit.update({ where: { id: auditId }, data: { pdfStatus: "READY", pdfUrl: stored, pdfGeneratedAt: loadedAt } });
    return stored;
  } catch (err) {
    if (kind === "customer") await prisma.audit.update({ where: { id: auditId }, data: { pdfStatus: "FAILED" } }).catch(() => undefined);
    throw err;
  }
}

/** The technical PDF is cached on disk only: current when present and newer than the audit run. */
export async function technicalPdfIfCurrent(publicToken: string, completedAt: Date | null): Promise<string | null> {
  const stored = `${PRIVATE_PREFIX}${pdfFileName(publicToken, "technical")}`;
  const abs = resolvePdfPath(stored);
  if (!abs) return null;
  try {
    const st = await fs.stat(abs);
    return !completedAt || st.mtime >= completedAt ? stored : null;
  } catch {
    return null;
  }
}
