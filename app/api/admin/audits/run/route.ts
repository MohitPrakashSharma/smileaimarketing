import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { dispatchAudit } from "@/lib/audit/engine";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { businessId, engine, newAudit } = body as { businessId?: string; engine?: "LEGACY_V1" | "CRAWL_V2"; newAudit?: boolean };

    if (!businessId) {
      return NextResponse.json({ error: "Missing businessId" }, { status: 400 });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Create or find audit
    let audit = await prisma.audit.findFirst({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
    });

    // `newAudit: true` keeps the previous report (e.g. to compare V1 vs V2);
    // otherwise the latest audit is re-run in place.
    if (!audit || newAudit) {
      audit = await prisma.audit.create({
        data: {
          businessId: business.id,
          status: "PENDING",
          score: 0,
        },
      });
    } else {
      audit = await prisma.audit.update({
        where: { id: audit.id },
        data: { status: "PENDING" },
      });
    }

    // Admin runs get the larger crawl budget; `engine` forces a specific engine.
    await dispatchAudit(audit.id, { trigger: "admin", engine });

    return NextResponse.json({ success: true, auditId: audit.id, publicToken: audit.publicToken, reportUrl: `/audit/${audit.publicToken}` }, { status: 200 });
  } catch (error) {
    console.error("Admin audit run POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
