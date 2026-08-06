import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { enrichBusinessContact } from "@/lib/apollo";
import { extractWebsiteContact, isUsableContactEmail, guessContactRole } from "@/lib/websiteContactExtractor";
import { initiateAutomaticOutreach } from "@/lib/outreach";

/**
 * Manual "send outreach now" trigger — tries a fresh Apollo/website lookup if
 * no contact exists yet, then hands off to the same automatic-send path the
 * pipeline itself uses (real queue, no separate approval step).
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

    const business = await prisma.business.findUnique({ where: { id }, include: { contacts: true } });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // A real, verified contact is required — never invent one. Try a fresh
    // Apollo lookup, then fall back to the practice's own website, before
    // giving up (common for small independent practices Apollo doesn't cover).
    let contact = business.contacts[0];
    if (!contact) {
      const apolloRes = await enrichBusinessContact(business.website);
      if (apolloRes.found && apolloRes.email) {
        contact = await prisma.contact.create({
          data: {
            businessId: business.id,
            firstName: apolloRes.firstName || "Practice",
            lastName: apolloRes.lastName || "Lead",
            email: apolloRes.email,
            phone: apolloRes.phone || null,
            role: apolloRes.role || "Principal Dentist",
            source: "APOLLO",
          },
        });
      } else {
        const siteContact = await extractWebsiteContact(business.website);
        if (!siteContact.found || !siteContact.email || !isUsableContactEmail(siteContact.email)) {
          return NextResponse.json(
            {
              error:
                "No verified contact found for this practice yet — Apollo and their own website both came up empty. Add a contact manually before starting outreach; we don't send to invented addresses.",
            },
            { status: 422 }
          );
        }
        contact = await prisma.contact.create({
          data: {
            businessId: business.id,
            firstName: "Practice",
            lastName: "Team",
            email: siteContact.email,
            phone: siteContact.phone || null,
            role: guessContactRole(siteContact.email),
            source: "WEBSITE",
          },
        });
      }
    }

    const result = await initiateAutomaticOutreach({ businessId: business.id, contactId: contact.id });
    if (!result.queued) {
      return NextResponse.json({ error: result.reason || "Could not queue outreach" }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      message: `Outreach sent to ${contact.email} — no approval step needed.`,
    }, { status: 200 });
  } catch (error) {
    console.error("Admin outreach trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
