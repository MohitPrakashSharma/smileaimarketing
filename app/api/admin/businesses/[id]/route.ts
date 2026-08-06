import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { buildAuditNarrative } from "@/lib/auditNarrative";

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

    // rawProviderRef is deliberately not selected — internal-only per
    // docs/mvp-readiness.md #6 ("do not expose complete raw provider
    // responses to the public frontend"). This is an admin page, but
    // there's no reason to ship an opaque provider payload to the browser.
    const business = await prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        address: true,
        city: true,
        state: true,
        country: true,
        phone: true,
        category: true,
        status: true,
        opportunityScore: true,
        providerSource: true,
        rating: true,
        reviewCount: true,
        googlePlaceId: true,
        lastCheckedAt: true,
        createdAt: true,
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

    // Pitch-ready, non-technical narrative for whoever's calling this practice —
    // built only from real findingsJson already computed at audit time.
    const latestAudit = business.audits[0];
    const narrative = latestAudit
      ? buildAuditNarrative({
          businessName: business.name,
          city: business.city,
          category: business.category,
          findings: latestAudit.results.map((r) => ({
            category: r.category,
            score: r.score,
            findingsJson: (r.findingsJson as Record<string, unknown>) || {},
          })),
          competitors: latestAudit.competitorGaps,
        })
      : null;

    return NextResponse.json({ business, narrative });
  } catch (error) {
    console.error("Admin business detail GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await prisma.business.update({
      where: { id },
      data: {
        status: body.status,
      },
    });

    return NextResponse.json({ business: updated });
  } catch (error) {
    console.error("Admin business PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
