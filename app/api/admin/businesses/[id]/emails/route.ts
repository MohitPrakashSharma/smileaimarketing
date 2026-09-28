import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { env, integrationStatus } from "@/lib/env.server";
import { sendOutreachEmail } from "@/lib/email.server";
import { applyMergeTags, renderLeadEmail } from "@/lib/emailTemplate";

/** Every email this lead's contacts have been sent (sequence and one-off), newest first, with engagement. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const messages = await prisma.emailMessage.findMany({
      where: { contact: { businessId: id } },
      orderBy: { createdAt: "desc" },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        sentBy: { select: { name: true } },
        step: { select: { subject: true, stepDay: true } },
        events: {
          where: { eventType: { in: ["email_opened", "email_clicked"] } },
          orderBy: { timestamp: "desc" },
          take: 25,
          select: { id: true, eventType: true, linkClicked: true, timestamp: true },
        },
      },
    });

    const liveSending = env.EMAIL_SEND_MODE === "live" && integrationStatus.gmail;
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        subject: m.subject ?? m.step?.subject ?? "(no subject)",
        kind: m.step ? "sequence" : "manual",
        status: m.status,
        contact: m.contact,
        sentBy: m.sentBy?.name ?? null,
        sentAt: m.sentAt,
        createdAt: m.createdAt,
        failureReason: m.failureReason,
        openCount: m.openCount,
        clickCount: m.clickCount,
        firstOpenedAt: m.firstOpenedAt,
        lastOpenedAt: m.lastOpenedAt,
        firstClickedAt: m.firstClickedAt,
        repliedAt: m.repliedAt,
        events: m.events,
      })),
      sending: liveSending
        ? { mode: "live" as const }
        : { mode: "test" as const, redirectTo: env.EMAIL_TEST_RECIPIENTS.split(",")[0].trim() },
    });
  } catch (error) {
    console.error("Lead emails GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const sendSchema = z.object({
  contactId: z.string().uuid(),
  subject: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(20000),
});

/** Write-and-send a one-off email to one of this lead's contacts. Sends immediately. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const parsed = sendSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Add a recipient, subject and message." }, { status: 400 });
    const { contactId, subject, body } = parsed.data;

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, businessId: id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            city: true,
            status: true,
            audits: { where: { status: "COMPLETED" }, orderBy: { createdAt: "desc" }, take: 1, select: { publicToken: true } },
          },
        },
      },
    });
    if (!contact) return NextResponse.json({ error: "That contact doesn't belong to this lead." }, { status: 404 });

    const business = contact.business;
    const audit = business.audits[0];
    const fields = {
      contactName: contact.firstName,
      clinicName: business.name,
      city: business.city,
      auditUrl: audit ? `${env.APP_BASE_URL}/audit/${audit.publicToken}` : "",
    };
    if (!audit && /\{\{\s*audit_?url\s*\}\}/i.test(`${subject}\n${body}`)) {
      return NextResponse.json({ error: "This lead has no completed audit yet, so {{auditUrl}} has nothing to link to." }, { status: 422 });
    }

    const finalSubject = applyMergeTags(subject, fields);
    const finalBody = applyMergeTags(body, fields);
    const rendered = renderLeadEmail({ bodyText: finalBody, unsubscribeUrl: `${env.APP_BASE_URL}/unsubscribe` });

    const message = await prisma.emailMessage.create({
      data: { contactId: contact.id, subject: finalSubject, bodyText: finalBody, sentById: admin.id, status: "QUEUED" },
    });

    const result = await sendOutreachEmail({
      emailMessageId: message.id,
      toEmail: contact.email,
      toName: `${contact.firstName} ${contact.lastName}`.trim(),
      subject: finalSubject,
      html: rendered.html,
      text: rendered.text,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "The email couldn't be sent.", messageId: message.id }, { status: 502 });
    }

    await prisma.salesActivity.create({
      data: {
        businessId: business.id,
        userId: admin.id,
        type: "EMAIL",
        content: `Emailed ${contact.firstName} ${contact.lastName}: "${finalSubject}"`,
      },
    });
    // First real contact moves an audited lead into active outreach; later stages are left alone.
    if (["DISCOVERED", "QUALIFIED", "AUDITED", "OUTREACH_PENDING"].includes(business.status)) {
      await prisma.business.update({ where: { id: business.id }, data: { status: "OUTREACH_ACTIVE" } });
    }

    return NextResponse.json({ success: true, messageId: message.id, mode: result.mode, deliveredTo: result.recipient });
  } catch (error) {
    console.error("Lead emails POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
