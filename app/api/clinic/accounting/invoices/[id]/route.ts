import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { computeTotals, invoiceBodySchema } from "@/lib/clinicInvoice.server";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, clinicId: auth.clinicId },
    include: {
      lines: { orderBy: { position: "asc" } },
      patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      ledgerEntry: { select: { id: true, date: true } },
      clinic: { select: { name: true, email: true, phone: true, address: true, city: true, province: true, website: true, currency: true } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  return NextResponse.json({ invoice });
}

/** Drafts only: once an invoice is sent it's a record, and changes go through void + a new invoice. */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const existing = await prisma.invoice.findFirst({ where: { id, clinicId: auth.clinicId }, select: { status: true, taxRateBps: true } });
    if (!existing) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (existing.status !== "DRAFT") return NextResponse.json({ error: "Only draft invoices can be edited." }, { status: 409 });

    const parsed = invoiceBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const body = parsed.data;
    if (body.patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: body.patientId, clinicId: auth.clinicId }, select: { id: true } });
      if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    // Drafts pick up the clinic's current tax setting, like a fresh invoice would.
    const clinic = await prisma.clinic.findUniqueOrThrow({ where: { id: auth.clinicId }, select: { taxRateBps: true, taxLabel: true } });
    const totals = computeTotals(body.lines, clinic.taxRateBps);
    await prisma.$transaction([
      prisma.invoiceLine.deleteMany({ where: { invoiceId: id } }),
      prisma.invoice.update({
        where: { id },
        data: {
          patientId: body.patientId ?? null,
          billToName: body.billToName,
          billToEmail: body.billToEmail || null,
          issueDate: body.issueDate,
          dueDate: body.dueDate ?? null,
          notes: body.notes?.trim() || null,
          taxRateBps: clinic.taxRateBps,
          taxLabel: clinic.taxLabel,
          ...totals,
          lines: { create: body.lines.map((l, i) => ({ ...l, position: i })) },
        },
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clinic invoice PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const existing = await prisma.invoice.findFirst({ where: { id, clinicId: auth.clinicId }, select: { status: true } });
  if (!existing) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only drafts can be deleted. Void a sent invoice instead." }, { status: 409 });
  }
  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
