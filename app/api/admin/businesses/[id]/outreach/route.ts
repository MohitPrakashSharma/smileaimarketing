import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { enrichBusinessContact } from "@/lib/apollo";
import { extractWebsiteContact, isUsableContactEmail, guessContactRole } from "@/lib/websiteContactExtractor";

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
      include: {
        contacts: true,
        campaign: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Ensure we have a campaign associated
    let campaignId = business.campaignId;
    if (!campaignId) {
      // Create fallback campaign
      const defaultCampaign = await prisma.campaign.create({
        data: {
          name: `${business.city} Inbound Leads`,
          city: business.city,
          category: business.category,
          status: "ACTIVE",
        },
      });
      campaignId = defaultCampaign.id;
      await prisma.business.update({
        where: { id: business.id },
        data: { campaignId },
      });
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
          },
        });
      }
    }

    // Create EmailSequence if not exists for the campaign
    let sequence = await prisma.emailSequence.findFirst({
      where: { campaignId: campaignId! },
    });

    if (!sequence) {
      sequence = await prisma.emailSequence.create({
        data: {
          campaignId: campaignId!,
          name: "Dental Clinic Google Maps Reactivation",
        },
      });
    }

    // Create EmailStep if not exists
    let step = await prisma.emailStep.findFirst({
      where: { sequenceId: sequence.id },
    });

    if (!step) {
      step = await prisma.emailStep.create({
        data: {
          sequenceId: sequence.id,
          stepDay: 0,
          subject: "Patient visibility opportunity gap for {{clinicName}}",
          bodyTemplate:
            "Hi {{contactName}},\n\nWe ran a free growth audit on {{clinicName}}'s online visibility in {{city}} — the kind of thing a prospective patient sees before they ever call you.\n\nA few nearby practices are currently ahead of you in Google search and maps. Nothing in the report is guesswork — it's built from what's actually visible online today, and it's yours to keep either way.",
        },
      });
    }

    // Queue Email Message
    await prisma.emailMessage.create({
      data: {
        contactId: contact.id,
        stepId: step.id,
        status: "QUEUED",
      },
    });

    // Update business status
    await prisma.business.update({
      where: { id: business.id },
      data: { status: "OUTREACH_ACTIVE" },
    });

    // Log Activity
    await prisma.salesActivity.create({
      data: {
        businessId: business.id,
        userId: admin.id,
        type: "EMAIL",
        content: `Outbound marketing email sequence initiated. First message queued for ${contact.email}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Outreach initiated and first sequence email queued.",
    }, { status: 200 });
  } catch (error) {
    console.error("Admin outreach trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
