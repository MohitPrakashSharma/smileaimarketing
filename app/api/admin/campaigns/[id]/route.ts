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
            contacts: { select: { id: true, emailMessages: { select: { status: true } } } },
            audits: { select: { id: true, status: true, pdfStatus: true } },
            appointments: { select: { id: true } },
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

    const sentStatuses = new Set(["QUEUED", "SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"]);
    const allMessages = campaign.businesses.flatMap((b) => b.contacts.flatMap((c) => c.emailMessages));

    const counts = {
      discovered: businesses.length,
      contactsFound: campaign.businesses.filter((b) => b.contacts.length > 0).length,
      audited: campaign.businesses.filter((b) => b.audits.some((a) => a.status === "COMPLETED")).length,
      pdfReady: campaign.businesses.filter((b) => b.audits.some((a) => a.pdfStatus === "READY")).length,
      outreachSent: campaign.businesses.filter((b) => b.contacts.some((c) => c.emailMessages.some((m) => sentStatuses.has(m.status)))).length,
      replied: campaign.businesses.filter((b) => b.appointments.length > 0 || b.contacts.some((c) => c.emailMessages.some((m) => m.status === "REPLIED"))).length,
      converted: campaign.businesses.filter((b) => b.status === "CONVERTED").length,
      // Kept for callers still reading the old shape.
      contacted: campaign.businesses.filter((b) => b.contacts.length > 0).length,
      totalMessagesQueuedOrSent: allMessages.length,
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
    const { status } = body;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ campaign }, { status: 200 });
  } catch (error) {
    console.error("Admin campaign detail PATCH error:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}
