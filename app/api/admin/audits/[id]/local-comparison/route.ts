import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { runCompetitorIntel, competitorIntelAvailable } from "@/lib/audit/competitors/stage";

/**
 * Re-runs the local comparison for one completed v2 audit (admin only).
 * Discovery is reused when it is less than 30 days old, so a re-run mostly
 * re-measures competitors whose PageSpeed run was unavailable (transient API
 * errors). It never touches the audit's scores or findings, and marks the
 * customer PDF as needing regeneration when measurements change.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const avail = competitorIntelAvailable();
  if (!avail.ok) return NextResponse.json({ error: `Local comparison is not enabled: ${avail.reason}` }, { status: 409 });

  const { id } = await params;
  const audit = await prisma.audit.findUnique({ where: { id }, select: { id: true, status: true, engine: true } });
  if (!audit) return NextResponse.json({ error: "Audit not found" }, { status: 404 });
  if (audit.engine !== "CRAWL_V2" || audit.status !== "COMPLETED") return NextResponse.json({ error: "Only completed v2 audits have a local comparison" }, { status: 409 });

  try {
    const result = await runCompetitorIntel(audit.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Local comparison failed" }, { status: 500 });
  }
}
