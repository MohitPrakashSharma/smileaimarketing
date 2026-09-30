import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { sendOutreachEmail } from "@/lib/email.server";
import { renderInvoiceEmail } from "@/lib/clinicInvoice.server";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Emails the invoice when it has an address, then marks it SENT. Re-sending a
 * SENT invoice just emails it again. With no address it's only marked sent
 * (handed over in person).
 */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, clinicId: auth.clinicId },
      include: {
        lines: { orderBy: { position: "asc" } },
        clinic: { select: { name: true, email: true, phone: true, address: true, city: true, province: true, currency: true } },
      },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (invoice.status !== "DRAFT" && invoice.status !== "SENT") {
      return NextResponse.json({ error: `A ${invoice.status.toLowerCase()} invoice can't be sent.` }, { status: 409 });
    }

    let email: { sent: boolean; mode?: string; recipient?: string; error?: string } = { sent: false };
    if (invoice.billToEmail) {
      const { html, text } = renderInvoiceEmail(invoice, invoice.clinic);
      const result = await sendOutreachEmail({
        toEmail: invoice.billToEmail,
        toName: invoice.billToName,
        subject: `Invoice ${invoice.number} from ${invoice.clinic.name}`,
        html,
        text,
      });
      if (!result.success) {
        return NextResponse.json({ error: `The email couldn't be sent: ${result.error ?? "unknown error"}` }, { status: 502 });
      }
      email = { sent: true, mode: result.mode, recipient: result.recipient };
    }

    await prisma.invoice.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error("Clinic invoice send error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
