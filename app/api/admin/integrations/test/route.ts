import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { discoveryQueue } from "@/lib/queue";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create a 1-lead test campaign
    const testCampaign = await prisma.campaign.create({
      data: {
        name: `Integration Health Test (${new Date().toLocaleTimeString()})`,
        city: "Austin",
        category: "Dental Clinic",
        maxBusinesses: 1,
        dataProvider: "TEST_PROVIDER",
        testMode: true,
        status: "DISCOVERING",
      },
    });

    const jobId = `health_test_${testCampaign.id}`;
    await discoveryQueue.add(
      "discover-businesses",
      {
        campaignId: testCampaign.id,
        city: testCampaign.city,
        category: testCampaign.category,
        maxBusinesses: 1,
        dataProvider: "TEST_PROVIDER",
      },
      { jobId }
    );

    return NextResponse.json({
      message: "Health test job queued successfully",
      campaignId: testCampaign.id,
      jobId,
    });
  } catch (error) {
    console.error("Integration test trigger error:", error);
    return NextResponse.json({ error: "Failed to queue test job" }, { status: 500 });
  }
}
