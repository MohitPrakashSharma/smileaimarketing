import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params;

    const audit = await prisma.audit.findUnique({
      where: { publicToken },
      include: {
        business: true,
        results: true,
        competitorGaps: true,
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit report not found" }, { status: 404 });
    }

    // Format the response payload safely
    const scorecard = {
      localVisibility: audit.results.find((r) => r.category === "LOCAL_VISIBILITY")?.score || 0,
      websiteQuality: audit.results.find((r) => r.category === "WEBSITE_QUALITY")?.score || 0,
      conversionExperience: audit.results.find((r) => r.category === "CONVERSION")?.score || 0,
      reviewsReputation: audit.results.find((r) => r.category === "REPUTATION")?.score || 0,
      competitorGap: audit.results.find((r) => r.category === "COMPETITOR_GAP")?.score || 0,
    };

    const findings = audit.results.map((r) => {
      const details = (r.detailsJson as any) || {};
      return {
        category: r.category,
        score: r.score,
        title: details.title || r.category,
        detail: details.description || "No description provided.",
      };
    });

    const competitors = audit.competitorGaps.map((c) => ({
      name: c.name,
      rank: c.rank,
      mapScore: c.mapScore,
    }));

    return NextResponse.json({
      business: {
        name: audit.business.name,
        website: audit.business.website,
        city: audit.business.city,
        opportunityScore: audit.score,
      },
      scorecard,
      findings,
      competitors,
    });
  } catch (error) {
    console.error("Fetch audit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
