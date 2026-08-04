import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const business = await prisma.business.findUnique({
      where: { id },
      include: {
        campaign: { select: { id: true, name: true } },
        contacts: true,
        appointments: { orderBy: { createdAt: "desc" } },
        salesActivities: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
        audits: {
          orderBy: { createdAt: "desc" },
          include: { results: true, competitorGaps: true },
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // rawProviderRef intentionally omitted from the response — internal-only
    // per docs/mvp-readiness.md #6 ("do not expose complete raw provider
    // responses to the public frontend"). This is an admin page, but there's
    // no reason to ship an opaque provider payload to the browser either.
    const { rawProviderRef: _rawProviderRef, ...businessSafe } = business;

    return NextResponse.json({ business: businessSafe });
  } catch (error) {
    console.error("Admin business detail GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
