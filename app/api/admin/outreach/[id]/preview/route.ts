import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { renderOutreachEmail } from "@/lib/emailTemplate";
import { env } from "@/lib/env.server";

/** Renders the exact same content the outreach worker would actually send — preview never drifts from reality. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const message = await prisma.emailMessage.findUnique({
      where: { id },
      include: {
        contact: { include: { business: { include: { audits: true } } } },
        step: true,
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const business = message.contact.business;
    const audit = business.audits[0];

    if (!audit) {
      return NextResponse.json({ error: "This business has no audit yet, so no report link exists." }, { status: 422 });
    }

    const rendered = renderOutreachEmail({
      subjectTemplate: message.step.subject,
      bodyTemplate: message.step.bodyTemplate,
      contactName: message.contact.firstName,
      clinicName: business.name,
      city: business.city,
      reportUrl: `${env.APP_BASE_URL}/audit/${audit.publicToken}`,
      pdfUrl: audit.pdfUrl ? `${env.APP_BASE_URL}${audit.pdfUrl}` : undefined,
      unsubscribeUrl: `${env.APP_BASE_URL}/unsubscribe`,
    });

    return NextResponse.json({
      subject: rendered.subject,
      html: rendered.html,
      to: `${message.contact.firstName} ${message.contact.lastName} <${message.contact.email}>`,
    });
  } catch (error) {
    console.error("Outreach preview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
