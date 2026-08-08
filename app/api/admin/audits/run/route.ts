import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { analysisQueue } from "@/lib/queue";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { businessId } = body;

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

    if (!audit) {
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

    // Enqueue analysis job
    await analysisQueue.add(
      "analyze-business",
      {
        auditId: audit.id,
        businessId: business.id,
        website: business.website,
        city: business.city,
      },
      { jobId: `analysis_${audit.id}_${Date.now()}` }
    );

    return NextResponse.json({ success: true, auditId: audit.id }, { status: 200 });
  } catch (error) {
    console.error("Admin audit run POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
