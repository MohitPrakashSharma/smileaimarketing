import { NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { generateV2AuditPdf, technicalPdfIfCurrent, downloadFileName, resolvePdfPath } from "@/lib/audit/pdf/generate";

/**
 * Internal download of the full technical report — the only place it is
 * served. Requires an admin session (ADMIN/SUPERADMIN) and is keyed by the
 * audit id, not the public token, so nothing a visitor holds can reach it.
 * The file is regenerated when missing or older than the audit run; our team
 * then shares it with the practice by hand after the website review.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const audit = await prisma.audit.findUnique({ where: { id }, include: { business: { select: { name: true } } } });
    if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    if (audit.engine !== "CRAWL_V2") return NextResponse.json({ error: "Technical reports exist for v2 audits only" }, { status: 404 });
    if (audit.status !== "COMPLETED") return NextResponse.json({ error: "The audit has not completed yet" }, { status: 409 });

    let stored = (await technicalPdfIfCurrent(audit.publicToken, audit.completedAt)) ?? (await generateV2AuditPdf(audit.id, "technical"));
    let abs = resolvePdfPath(stored);
    let bytes: Buffer;
    try {
      if (!abs) throw new Error("invalid stored PDF locator");
      bytes = await fs.readFile(abs);
    } catch {
      stored = await generateV2AuditPdf(audit.id, "technical");
      abs = resolvePdfPath(stored);
      if (!abs) throw new Error("invalid stored PDF locator");
      bytes = await fs.readFile(abs);
    }

    const fileName = downloadFileName(audit.business.name, audit.completedAt ?? audit.createdAt, "technical");
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Technical PDF download error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "We couldn't generate the technical report right now." }, { status: 500 });
  }
}
