import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { discoveryQueue } from "@/lib/queue";

export async function POST(
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
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Queue discovery job in BullMQ with idempotency jobId
    const jobId = `discovery_${campaign.id}_${Date.now()}`;
    await discoveryQueue.add(
      "discover-businesses",
      {
        campaignId: campaign.id,
        city: campaign.city,
        category: campaign.category,
        maxBusinesses: campaign.maxBusinesses,
        dataProvider: campaign.dataProvider,
      },
      { jobId }
    );

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: "DISCOVERING",
        startedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Campaign discovery job queued successfully",
        campaign: updatedCampaign,
        jobId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Start campaign error:", error);
    return NextResponse.json({ error: "Failed to start campaign" }, { status: 500 });
  }
}
