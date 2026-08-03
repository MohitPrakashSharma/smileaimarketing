import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const leadSchema = z.object({
  pendingAuditId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  phone: z.string().optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: "Consent is required",
  }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = leadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.format() }, { status: 400 });
    }

    const { pendingAuditId, firstName, lastName, email, role, phone, consent } = result.data;

    // Fetch the pending audit
    const audit = await prisma.audit.findUnique({
      where: { id: pendingAuditId },
      include: { business: true },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const business = audit.business;

    // Create or update contact
    const contact = await prisma.contact.upsert({
      where: {
        businessId_email: { businessId: business.id, email },
      },
      update: {
        firstName,
        lastName,
        role,
        phone,
      },
      create: {
        businessId: business.id,
        firstName,
        lastName,
        email,
        role,
        phone,
      },
    });

    // Create consent record
    await prisma.consentRecord.create({
      data: {
        contactId: contact.id,
        consentType: "MARKETING_EMAIL",
        consentGranted: consent,
      },
    });

    // Compute deterministic audit results
    const localVisibilityScore = 15;
    const websiteQualityScore = 12;
    const conversionScore = 10;
    const reviewsScore = 12;
    const competitorScore = 8;
    const totalScore = localVisibilityScore + websiteQualityScore + conversionScore + reviewsScore + competitorScore;

    // Seed AuditResults
    const results = [
      {
        category: "LOCAL_VISIBILITY",
        score: localVisibilityScore,
        findingsJson: { rank: 6, mapPresence: "Low" },
        detailsJson: {
          title: "Local Google Maps Visibility",
          description: `Your clinic ranks #6 in ${business.city} for local dental search. This means most high-intent patients find your competitors first.`,
        },
      },
      {
        category: "WEBSITE_QUALITY",
        score: websiteQualityScore,
        findingsJson: { speed: "Slow", ssl: true },
        detailsJson: {
          title: "Website Speed & Structure",
          description: "Your website is secure (SSL active) but suffers from slow paint speeds on mobile devices. Optimizing image sizes and scripts can improve retention.",
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
        findingsJson: { reviewsCount: 14, averageStars: 4.3 },
        detailsJson: {
          title: "Online Reviews & Trust",
          description: "Your clinic has 14 Google reviews with a 4.3 rating. Promoting text-reminders to happy patients can easily boost this to a 4.8 star average.",
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

    // Delete any old results if they exist, then re-seed
    await prisma.auditResult.deleteMany({ where: { auditId: audit.id } });
    await prisma.competitor.deleteMany({ where: { auditId: audit.id } });

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
        { auditId: audit.id, name: `${business.city} Family Dentistry`, rank: 1, mapScore: 92 },
        { auditId: audit.id, name: "Apex Dental Group", rank: 2, mapScore: 85 },
      ],
    });

    // Update business and audit statuses
    await prisma.business.update({
      where: { id: business.id },
      data: {
        status: "AUDITED",
        opportunityScore: totalScore,
      },
    });

    await prisma.audit.update({
      where: { id: audit.id },
      data: {
        status: "COMPLETED",
        score: totalScore,
      },
    });

    return NextResponse.json({
      publicToken: audit.publicToken,
      redirectUrl: `/audit/${audit.publicToken}`,
    }, { status: 201 });
  } catch (error) {
    console.error("Unlock lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
