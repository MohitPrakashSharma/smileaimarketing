import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics";
import { dispatchAudit } from "@/lib/audit/engine";

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
        source: "SELF_SERVE",
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

    // The analysis itself runs in the audit engine (started by
    // inbound-trigger). This route only captures the lead. If the audit never
    // started — e.g. the worker was down — dispatch it now as a safety net.
    if (audit.status === "PENDING" || audit.status === "FAILED") {
      await dispatchAudit(audit.id, { trigger: "self_serve" }, after);
    }

    // The contact-unlock step is the real lead-generation moment — maps to
    // GA4's generate_lead.
    await trackEvent({
      eventName: "report_unlock_complete",
      businessId: business.id,
      auditId: audit.id,
    });

    return NextResponse.json(
      {
        publicToken: audit.publicToken,
        redirectUrl: `/audit/${audit.publicToken}`,
        status: audit.status,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unlock lead error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
