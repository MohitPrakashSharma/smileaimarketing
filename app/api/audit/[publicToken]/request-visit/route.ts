import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics";
import { findOpenTechnicalReportRequest, technicalReportRequestData } from "@/lib/audit/technicalReport";

const visitSchema = z.object({
  address: z.string().min(5),
  preferredWindow: z.string().min(3),
  notes: z.string().optional(),
  technicalReport: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params;
    const body = await request.json();
    const result = visitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { address, preferredWindow, notes } = result.data;
    const technicalReport = result.data.technicalReport === true;

    // Find audit and contact
    const audit = await prisma.audit.findUnique({
      where: { publicToken },
      include: {
        business: {
          include: { contacts: true },
        },
      },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const business = audit.business;
    const contact = business.contacts[0];

    if (!contact) {
      return NextResponse.json({ error: "Lead contact details missing" }, { status: 400 });
    }

    // Create Appointment as REQUESTED — an in-person visit must never appear
    // confirmed until an admin approves it (docs/mvp-readiness.md #26).
    if (technicalReport) {
      const open = await findOpenTechnicalReportRequest(prisma, audit.id);
      if (open) return NextResponse.json({ appointmentId: open.id, status: open.status, technicalReportStatus: open.technicalReportStatus, duplicate: true }, { status: 200 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        contactId: contact.id,
        auditId: audit.id,
        type: "IN_PERSON",
        status: "REQUESTED",
        scheduledTime: new Date(), // Placeholder — admin sets the real time on approval
        durationMinutes: 30,
        address,
        preferredWindow,
        notes,
        ...technicalReportRequestData(technicalReport),
      },
    });

    // Business status is intentionally left unchanged here — it only moves
    // to CONVERTED once an admin approves the visit (see
    // app/api/admin/appointments/[id]/route.ts).

    // Create sales activity
    await prisma.salesActivity.create({
      data: {
        businessId: business.id,
        userId: (await prisma.user.findFirst())?.id || "unknown",
        type: "MEETING",
        content: `Offline clinic drop-off visit requested for ${address} during ${preferredWindow}.${technicalReport ? " The lead requested the full technical report — share it after the review." : ""}`,
      },
    });

    if (technicalReport) {
      await trackEvent({ eventName: "technical_report_requested", businessId: business.id, auditId: audit.id, properties: { type: "in_person", appointment_id: appointment.id } });
    }

    await trackEvent({
      eventName: "meeting_requested",
      businessId: business.id,
      auditId: audit.id,
      properties: { type: "in_person" },
    });

    return NextResponse.json({
      appointmentId: appointment.id,
      status: appointment.status,
      technicalReportStatus: appointment.technicalReportStatus,
    }, { status: 200 });
  } catch (error) {
    console.error("Request visit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
