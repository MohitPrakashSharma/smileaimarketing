import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { enrichBusinessContact } from "@/lib/apollo";
import { extractWebsiteContact, isUsableContactEmail, guessContactRole } from "@/lib/websiteContactExtractor";

/**
 * Live, on-demand lookup so an admin can see exactly what Google/DataForSEO
 * (already stored on the Business record) vs. Apollo vs. the practice's own
 * website actually return for this specific business — including the
 * "nothing found" case, which is real information, not a bug to hide.
 * Never persists anything by itself; POST { save: true } to save a result as a Contact.
 */
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
    const body = await request.json().catch(() => ({}));

    const business = await prisma.business.findUnique({ where: { id } });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Run both live checks in parallel — the admin should see both results,
    // not just whichever one the pipeline happens to prefer.
    const [apolloRes, siteRes] = await Promise.all([
      enrichBusinessContact(business.website),
      extractWebsiteContact(business.website),
    ]);

    const siteUsable = siteRes.found && siteRes.email && isUsableContactEmail(siteRes.email);

    // Optional save step — the admin picks which result (if either) to keep as the real contact.
    if (body.save === "apollo" && apolloRes.found && apolloRes.email) {
      await prisma.contact.upsert({
        where: { businessId_email: { businessId: business.id, email: apolloRes.email } },
        update: {},
        create: {
          businessId: business.id,
          firstName: apolloRes.firstName || "Practice",
          lastName: apolloRes.lastName || "Lead",
          email: apolloRes.email,
          phone: apolloRes.phone || null,
          role: apolloRes.role || "Principal Dentist",
          source: "APOLLO",
        },
      });
    } else if (body.save === "website" && siteUsable && siteRes.email) {
      await prisma.contact.upsert({
        where: { businessId_email: { businessId: business.id, email: siteRes.email } },
        update: {},
        create: {
          businessId: business.id,
          firstName: "Practice",
          lastName: "Team",
          email: siteRes.email,
          phone: siteRes.phone || null,
          role: guessContactRole(siteRes.email),
          source: "WEBSITE",
        },
      });
    }

    return NextResponse.json({
      google: {
        // Already stored on the Business record from discovery — Google/DataForSEO
        // never returns a named contact, only these business-level facts.
        name: business.name,
        address: business.address,
        phone: business.phone,
        rating: business.rating,
        reviewCount: business.reviewCount,
        googlePlaceId: business.googlePlaceId,
        providerSource: business.providerSource,
      },
      apollo: {
        found: apolloRes.found,
        firstName: apolloRes.firstName,
        lastName: apolloRes.lastName,
        email: apolloRes.email,
        phone: apolloRes.phone,
        role: apolloRes.role,
        confidenceScore: apolloRes.confidenceScore,
        error: apolloRes.error,
      },
      website: {
        found: Boolean(siteUsable),
        email: siteRes.email,
        phone: siteRes.phone,
        address: siteRes.address,
      },
    });
  } catch (error) {
    console.error("Business enrichment-check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
