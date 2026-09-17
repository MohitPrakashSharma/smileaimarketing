import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics";
import { createGoogleMeetEvent } from "@/lib/googleCalendar";
import { findOpenTechnicalReportRequest, technicalReportRequestData } from "@/lib/audit/technicalReport";

const bookSchema = z.object({
  scheduledTime: z.string().datetime(),
  notes: z.string().optional(),
  // Set by the consultation page when the visitor came from "Request Full Technical
  // Report". Only a flag: the PDF itself is never sent from here.
  technicalReport: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicToken: string }> }
) {
  try {
    const { publicToken } = await params;
    const body = await request.json();
    const result = bookSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const { scheduledTime, notes } = result.data;
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

    // A repeated technical-report submission for the same audit reuses the open
    // request instead of creating a second lead record for the team to triage.
    if (technicalReport) {
      const open = await findOpenTechnicalReportRequest(prisma, audit.id);
      if (open) {
        return NextResponse.json({ appointmentId: open.id, status: open.status, joinUrl: open.meetLink ?? null, technicalReportStatus: open.technicalReportStatus, duplicate: true }, { status: 200 });
      }
    }

    // Create Appointment with status REQUESTED
    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        contactId: contact.id,
        auditId: audit.id,
        type: "ONLINE",
        status: "REQUESTED",
        scheduledTime: new Date(scheduledTime),
        durationMinutes: 15,
        notes,
        ...technicalReportRequestData(technicalReport),
      },
    });

    if (technicalReport) {
      await trackEvent({ eventName: "technical_report_requested", businessId: business.id, auditId: audit.id, properties: { type: "online", appointment_id: appointment.id } });
    }

    await trackEvent({
      eventName: "booking_confirmed",
      businessId: business.id,
      auditId: audit.id,
      properties: { type: "online", appointment_id: appointment.id },
    });

    // Update business status
    await prisma.business.update({
      where: { id: business.id },
      data: { status: "CONVERTED" },
    });

    // Create sales activity
    await prisma.salesActivity.create({
      data: {
        businessId: business.id,
        userId: (await prisma.user.findFirst())?.id || "unknown",
        type: "MEETING",
        content: `Online 15-minute consultation booked via private audit link for ${scheduledTime}.${technicalReport ? " The lead requested the full technical report — share it after the review." : ""}`,
      },
    });

    const meetResult = await createGoogleMeetEvent({
      appointmentId: appointment.id,
      summary: `Smile AI Strategy Session with ${business.name}`,
      description: `Strategy consultation for ${business.name} (${business.website}) in ${business.city}.`,
      startTime: new Date(scheduledTime),
      durationMinutes: 15,
      attendeeEmail: contact.email,
    });

    if (meetResult.status === "CONFIRMED") {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { googleEventId: meetResult.eventId, meetLink: meetResult.meetUrl },
      });
    }

    return NextResponse.json({
      appointmentId: appointment.id,
      status: appointment.status,
      // Only ever a real, working link — never a placeholder that looks real.
      // When null, the confirmation copy should say a link is coming by email/admin, not show a broken one.
      joinUrl: meetResult.status === "CONFIRMED" ? meetResult.meetUrl : null,
      technicalReportStatus: appointment.technicalReportStatus,
    }, { status: 200 });
  } catch (error) {
    console.error("Book meeting error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
