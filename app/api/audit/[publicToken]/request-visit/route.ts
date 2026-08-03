import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const visitSchema = z.object({
  address: z.string().min(5),
  preferredWindow: z.string().min(3),
  notes: z.string().optional(),
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

    // Create Appointment
    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        contactId: contact.id,
        type: "IN_PERSON",
        status: "SCHEDULED",
        scheduledTime: new Date(), // Set temporary date, salesperson will override
        durationMinutes: 30,
        address,
        preferredWindow,
        notes,
      },
    });

    // Update business status to cancel future outreach
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
        content: `Offline clinic drop-off visit requested for ${address} during ${preferredWindow}.`,
      },
    });

    return NextResponse.json({
      appointmentId: appointment.id,
      status: appointment.status,
    }, { status: 200 });
  } catch (error) {
    console.error("Request visit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
