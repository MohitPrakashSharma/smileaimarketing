import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { z } from "zod";
import { normalizeDomain, normalizeName } from "@/lib/normalize";

const campaignSchema = z
  .object({
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
    dataProvider: z.enum(["MOCK", "GOOGLE_PLACES", "DATAFORSEO"]).default("MOCK"),
    outreachDailyLimit: z.number().int().min(1).max(50).default(8),
    testMode: z.boolean().default(true),
  })
  .refine((data) => data.dataProvider === "MOCK", {
    message: "Google Places and DataForSEO aren't connected yet — only mock/seed discovery is available.",
    path: ["dataProvider"],
  });

// Template pool for the still-MOCKED discovery seeding (docs/mvp-readiness.md
// #8-9). Real discovery is blocked on Google Places/DataForSEO credentials.
const NAME_TEMPLATES: ((city: string) => string)[] = [
  (city) => `${city} Dental Care Group`,
  () => "Apex Family Dentistry",
  () => "Downtown Dental Studio",
  (city) => `${city} Smile Center`,
  () => "Bright Smile Dental",
  (city) => `${city} Family Dental`,
  () => "Riverside Dental Associates",
  (city) => `${city} Modern Dentistry`,
  () => "Gentle Care Dental",
  (city) => `${city} Community Dental`,
];

function slugifyCity(city: string) {
  return city.toLowerCase().replace(/\s+/g, "");
}

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
      return NextResponse.json({ error: result.error.issues[0]?.message || "Invalid parameters" }, { status: 400 });
    }

    const {
      name,
      country,
      state,
      city,
      category,
      maxBusinesses,
      minReviewCount,
      websiteRequired,
      excludeChains,
      excludeExistingContacts,
      keywords,
      competitorCount,
      dataFreshnessDays,
      dataProvider,
      outreachDailyLimit,
      testMode,
    } = result.data;

    const campaign = await prisma.campaign.create({
      data: {
        name,
        country,
        state,
        city,
        category,
        maxBusinesses,
        minReviewCount,
        websiteRequired,
        excludeChains,
        excludeExistingContacts,
        keywords,
        competitorCount,
        dataFreshnessDays,
        dataProvider,
        outreachDailyLimit,
        testMode,
        status: "ACTIVE",
      },
    });

    // Simulate Background Discovery Worker by seeding up to maxBusinesses
    // discovered businesses for this campaign. NOTE: this is still MOCKED
    // discovery (docs/mvp-readiness.md #8-9) — real discovery is blocked on
    // Google Places/DataForSEO credentials. The normalization fields are
    // populated now so the dedup mechanism itself is exercised and ready
    // for when a real provider is wired in.
    const citySlug = slugifyCity(city);
    const seedBusinesses = NAME_TEMPLATES.slice(0, maxBusinesses).map((template, i) => {
      const bizName = template(city);
      return {
        name: bizName,
        website: `https://${bizName.toLowerCase().replace(/[^a-z0-9]+/g, "")}${i}${citySlug}.com`,
      };
    });

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
