import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { AuditProgress } from "@/lib/audit/progress";

/**
 * Progressive-audit polling endpoint for the wizard. The audit id is an
 * unguessable UUID the caller received from inbound-trigger. Returns stage
 * progress and verified findings so far — never scores (plan §0.2).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(auditId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { id: true, status: true, engine: true, progressJson: true, errorMessage: true, findings: { select: { title: true, severity: true, pillar: true, affectedPageCount: true, priorityScore: true }, orderBy: { priorityScore: "desc" }, take: 8 } },
  });
  if (!audit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const progress = (audit.progressJson as unknown as AuditProgress | null) ?? null;
  return NextResponse.json({
    status: audit.status,
    engine: audit.engine,
    progress,
    previewReady: audit.status === "COMPLETED" || Boolean(progress?.previewReady),
    findingsSoFar: audit.findings.map(({ title, severity, pillar, affectedPageCount }) => ({ title, severity, pillar, affectedPageCount })),
    error: audit.status === "FAILED" ? audit.errorMessage : null,
  });
}
