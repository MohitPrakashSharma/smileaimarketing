import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { z } from "zod";
import { logEngagementEvent } from "@/lib/events";

const campaignSchema = z.object({
  name: z.string().min(3),
  country: z.string().min(2).default("US"),
  state: z.string().optional(),
  city: z.string().min(2),
  category: z.string().min(2),
  maxBusinesses: z.number().int().min(1).max(50).default(10),
  minReviewCount: z.number().int().min(0).optional(),
  websiteRequired: z.boolean().default(true),
  excludeChains: z.boolean().default(false),
  excludeExistingContacts: z.boolean().default(false),
  keywords: z.array(z.string().min(1)).default([]),
  competitorCount: z.number().int().min(1).max(10).default(3),
  dataFreshnessDays: z.number().int().min(1).max(90).default(30),
  dataProvider: z.string().default("TEST_PROVIDER"),
  outreachDailyLimit: z.number().int().min(1).max(50).default(8),
  testMode: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaigns = await prisma.campaign.findMany({
      include: {
        _count: {
          select: { businesses: true },
        },
        businesses: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns }, { status: 200 });
  } catch (error) {
    console.error("Admin campaigns GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = campaignSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid parameters" },
        { status: 400 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...result.data,
        status: "DRAFT",
      },
    });

    await logEngagementEvent({
      eventType: "campaign_created",
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Admin campaigns POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
