import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { checkWebsite, scoreWebsiteQuality } from "@/lib/websiteCheck.server";

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

    const business = await prisma.business.findUnique({
      where: { id },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Real, credential-free website check (see docs/mvp-readiness.md #15-18).
    const websiteCheck = await checkWebsite(business.website);
    const websiteQuality = scoreWebsiteQuality(websiteCheck);

    // Remaining categories are deterministic placeholders pending
    // DataForSEO/Google Places integration (docs/integration-audit.md #7-8).
    const localVisibilityScore = 18;
    const websiteQualityScore = websiteQuality.score;
    const conversionScore = 12;
    const reviewsScore = 10;
    const competitorScore = 10;
    const totalScore = localVisibilityScore + websiteQualityScore + conversionScore + reviewsScore + competitorScore;

    // Create Audit record
    const audit = await prisma.audit.create({
      data: {
        businessId: business.id,
        status: "COMPLETED",
        score: totalScore,
      },
    });

    // Seed AuditResults
    const results = [
      {
        category: "LOCAL_VISIBILITY",
        score: localVisibilityScore,
        findingsJson: { rank: 8, mapPresence: "Low" },
        detailsJson: {
          title: "Local Google Maps Visibility",
          description: `Your clinic ranks #8 in ${business.city} for local dental search. This means most high-intent patients find your competitors first.`,
        },
      },
      {
        category: "WEBSITE_QUALITY",
        score: websiteQualityScore,
        findingsJson: websiteQuality.findings,
        detailsJson: {
          title: websiteQuality.title,
          description: websiteQuality.description,
        },
      },
      {
        category: "CONVERSION",
        score: conversionScore,
        findingsJson: { bookingWidget: false, clickToCall: true },
        detailsJson: {
          title: "Patient Booking Experience",
          description: "Patients cannot schedule consultations directly online from your website. Adding a 1-click booking tool can double calendar bookings.",
        },
      },
      {
        category: "REPUTATION",
        score: reviewsScore,
        findingsJson: { reviewsCount: 8, averageStars: 4.0 },
        detailsJson: {
          title: "Online Reviews & Trust",
          description: "Your clinic has 8 Google reviews with a 4.0 rating. Promoting text-reminders to happy patients can easily boost this to a 4.8 star average.",
        },
      },
      {
        category: "COMPETITOR_GAP",
        score: competitorScore,
        findingsJson: { topCompetitorReviews: 89, topCompetitorRank: 1 },
        detailsJson: {
          title: "Competitor Market Gap",
          description: "The top ranking dental clinic in your area holds 89 reviews. Bridging this gap will require active review campaigns and map citations.",
        },
      },
    ];

    for (const res of results) {
      await prisma.auditResult.create({
        data: {
          auditId: audit.id,
          category: res.category,
          score: res.score,
          findingsJson: res.findingsJson,
          detailsJson: res.detailsJson,
        },
      });
    }

    // Seed mock competitors
    await prisma.competitor.createMany({
      data: [
        { auditId: audit.id, name: `${business.city} Smile Spa`, rank: 1, mapScore: 88 },
        { auditId: audit.id, name: "Gentle Dental Chicago", rank: 2, mapScore: 82 },
      ],
    });

    // Update business
    await prisma.business.update({
      where: { id: business.id },
      data: {
        status: "OUTREACH_PENDING",
        opportunityScore: totalScore,
        lastCheckedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      auditId: audit.id,
      score: totalScore,
    }, { status: 201 });
  } catch (error) {
    console.error("Admin manual audit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
