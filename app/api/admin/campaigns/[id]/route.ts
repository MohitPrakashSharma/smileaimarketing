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

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        businesses: {
          include: {
            contacts: { select: { id: true } },
            audits: { select: { id: true, status: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const businesses = campaign.businesses.map((b) => ({
      id: b.id,
      name: b.name,
      website: b.website,
      status: b.status,
      opportunityScore: b.opportunityScore,
      contactCount: b.contacts.length,
      auditCount: b.audits.length,
      providerSource: b.providerSource,
    }));

    const counts = {
      discovered: businesses.length,
      audited: campaign.businesses.filter((b) => b.audits.some((a) => a.status === "COMPLETED")).length,
      contacted: campaign.businesses.filter((b) => b.contacts.length > 0).length,
      converted: campaign.businesses.filter((b) => b.status === "CONVERTED").length,
    };

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        country: campaign.country,
        state: campaign.state,
        city: campaign.city,
        category: campaign.category,
        status: campaign.status,
        createdAt: campaign.createdAt,
        maxBusinesses: campaign.maxBusinesses,
        minReviewCount: campaign.minReviewCount,
        websiteRequired: campaign.websiteRequired,
        excludeChains: campaign.excludeChains,
        excludeExistingContacts: campaign.excludeExistingContacts,
        keywords: campaign.keywords,
        competitorCount: campaign.competitorCount,
        dataFreshnessDays: campaign.dataFreshnessDays,
        dataProvider: campaign.dataProvider,
        outreachDailyLimit: campaign.outreachDailyLimit,
        testMode: campaign.testMode,
      },
      counts,
      businesses,
    });
  } catch (error) {
    console.error("Admin campaign detail GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
