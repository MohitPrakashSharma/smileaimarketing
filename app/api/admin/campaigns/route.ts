import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { z } from "zod";
import { normalizeDomain, normalizeName } from "@/lib/normalize";

const campaignSchema = z.object({
  name: z.string().min(3),
  city: z.string().min(2),
  category: z.string().min(2),
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
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { name, city, category } = result.data;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        city,
        category,
        status: "ACTIVE",
      },
    });

    // Simulate Background Discovery Worker by seeding 3 discovered businesses for this campaign.
    // NOTE: this is still MOCKED discovery (docs/mvp-readiness.md #8-9) — real
    // discovery is blocked on Google Places/DataForSEO credentials. The
    // normalization fields are populated now so the dedup mechanism itself
    // is exercised and ready for when a real provider is wired in.
    const seedBusinesses = [
      { name: `${city} Dental Care Group`, website: `https://${city.toLowerCase().replace(/\s+/g, "")}dentalcare.com` },
      { name: `Apex Family Dentistry`, website: `https://apexfamilydentist${city.toLowerCase().replace(/\s+/g, "")}.com` },
      { name: `Downtown Dental Studio`, website: `https://downtowndental${city.toLowerCase().replace(/\s+/g, "")}.com` },
    ];

    await prisma.business.createMany({
      data: seedBusinesses.map((b) => ({
        campaignId: campaign.id,
        name: b.name,
        normalizedName: normalizeName(b.name),
        website: b.website,
        normalizedDomain: normalizeDomain(b.website),
        city,
        category,
        status: "DISCOVERED" as const,
        opportunityScore: 0,
        providerSource: "SEED",
        lastCheckedAt: new Date(),
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("Admin campaigns POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
