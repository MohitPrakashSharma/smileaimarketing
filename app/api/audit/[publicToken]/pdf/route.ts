import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateLightAuditPdf } from "@/lib/pdfGenerator";
import { trackEvent } from "@/lib/analytics";
import { generateV2AuditPdf, customerPdfIsCurrent, technicalPdfIfCurrent, downloadFileName, resolvePdfPath, type PdfKind } from "@/lib/audit/pdf/generate";
import fs from "fs/promises";

/**
 * PDF download. Access rule is the same as the report itself: whoever holds
 * the unguessable public token. V1 audits use the legacy two-page PDF; v2
 * audits use the customer report (default) or, with `?variant=technical`,
 * the technical report. v2 files live outside `public/` and are only served
 * here; stale or missing files are regenerated. Errors never leak internals.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params;

    const audit = await prisma.audit.findUnique({
      where: { publicToken },
      include: {
        business: true,
        results: true,
        competitorGaps: true,
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit report not found" }, { status: 404 });
    }
    if (audit.status !== "COMPLETED") {
      return NextResponse.json({ error: "The audit is still running — the PDF is available once it completes." }, { status: 409 });
    }

    const kind: PdfKind = new URL(request.url).searchParams.get("variant") === "technical" ? "technical" : "customer";
    let pdfRelativeUrl: string | null = null;

    if (audit.engine === "CRAWL_V2") {
      if (kind === "technical") pdfRelativeUrl = (await technicalPdfIfCurrent(audit.publicToken, audit.completedAt)) ?? (await generateV2AuditPdf(audit.id, "technical"));
      else pdfRelativeUrl = customerPdfIsCurrent(audit) ? audit.pdfUrl : await generateV2AuditPdf(audit.id, "customer");
    } else {
      pdfRelativeUrl = audit.pdfUrl;
      // If PDF is not ready yet, generate it on demand (legacy V1 layout).
      if (!pdfRelativeUrl || audit.pdfStatus !== "READY") {
        const findings = audit.results.map((r) => {
          const details = (r.detailsJson as Record<string, unknown> | null) || {};
          return {
            category: r.category,
            score: r.score,
            title: typeof details.title === "string" ? details.title : r.category,
            detail: typeof details.description === "string" ? details.description : "Audit finding",
            findingsJson: (r.findingsJson as Record<string, unknown> | null) || {},
          };
        });
        const competitors = audit.competitorGaps.map((c) => ({ name: c.name, rank: c.rank, mapScore: c.mapScore || undefined }));
        pdfRelativeUrl = await generateLightAuditPdf({
          auditId: audit.id,
          publicToken: audit.publicToken,
          businessName: audit.business.name,
          city: audit.business.city,
          category: audit.business.category,
          website: audit.business.website,
          opportunityScore: audit.score,
          summaryText: audit.summaryText || `${audit.business.name} Audit Report`,
          findings,
          competitors,
        });
      }
    }

    // Serve the file; if the cached file vanished from disk, regenerate once.
    const readPdf = async (stored: string) => {
      const abs = resolvePdfPath(stored);
      if (!abs) throw new Error("invalid stored PDF locator");
      return fs.readFile(abs);
    };
    let fileBuffer: Buffer;
    try {
      fileBuffer = await readPdf(pdfRelativeUrl!);
    } catch {
      if (audit.engine !== "CRAWL_V2") throw new Error("cached PDF missing");
      pdfRelativeUrl = await generateV2AuditPdf(audit.id, kind);
      fileBuffer = await readPdf(pdfRelativeUrl);
    }

    await trackEvent({ eventName: "pdf_download", businessId: audit.businessId, auditId: audit.id });

    const fileName = audit.engine === "CRAWL_V2" ? downloadFileName(audit.business.name, audit.completedAt ?? audit.createdAt, kind) : `${audit.business.name.replace(/[^a-zA-Z0-9]/g, "_")}_Audit.pdf`;
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(fileBuffer.byteLength),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    // Log server-side only; the client gets a generic message (no stack, config or keys).
    console.error("PDF download error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn't generate the PDF right now. Please try again in a moment." }, { status: 500 });
  }
}
