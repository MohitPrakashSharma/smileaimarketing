import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { INVOICE_INCOME_CATEGORY, dateString } from "@/lib/clinicInvoice.server";

type Ctx = { params: Promise<{ id: string }> };

const paySchema = z.object({
  paidAt: dateString,
  paymentMethod: z.string().trim().min(1, "Choose a payment method.").max(60),
});

/** Marks the invoice paid and books the matching income entry in the ledger. */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const parsed = paySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const invoice = await prisma.invoice.findFirst({ where: { id, clinicId: auth.clinicId } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (invoice.status !== "DRAFT" && invoice.status !== "SENT") {
      return NextResponse.json({ error: `This invoice is already ${invoice.status.toLowerCase()}.` }, { status: 409 });
    }

    await prisma.$transaction([
      prisma.invoice.update({
        where: { id },
        data: { status: "PAID", paidAt: parsed.data.paidAt, paymentMethod: parsed.data.paymentMethod },
      }),
      prisma.ledgerEntry.create({
        data: {
          clinicId: auth.clinicId,
          type: "INCOME",
          category: INVOICE_INCOME_CATEGORY,
          description: `Invoice ${invoice.number} (${parsed.data.paymentMethod})`,
          counterparty: invoice.billToName,
          amountCents: invoice.totalCents,
          taxCents: invoice.taxCents,
          date: parsed.data.paidAt,
          invoiceId: invoice.id,
          createdById: auth.userId,
        },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clinic invoice pay error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
