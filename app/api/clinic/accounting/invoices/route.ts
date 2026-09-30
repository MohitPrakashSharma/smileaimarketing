import { NextResponse } from "next/server";
import type { InvoiceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { computeTotals, getClinicMoneySettings, invoiceBodySchema } from "@/lib/clinicInvoice.server";

const STATUSES: InvoiceStatus[] = ["DRAFT", "SENT", "PAID", "VOID"];

export async function GET(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  try {
    const status = new URL(request.url).searchParams.get("status") as InvoiceStatus | null;
    const invoices = await prisma.invoice.findMany({
      where: { clinicId: auth.clinicId, ...(status && STATUSES.includes(status) ? { status } : {}) },
      select: {
        id: true,
        number: true,
        billToName: true,
        billToEmail: true,
        status: true,
        issueDate: true,
        dueDate: true,
        totalCents: true,
        sentAt: true,
        paidAt: true,
        patientId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    const clinic = await getClinicMoneySettings(auth.clinicId);
    return NextResponse.json({ invoices, clinic });
  } catch (error) {
    console.error("Clinic invoices GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = invoiceBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const body = parsed.data;

    if (body.patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: body.patientId, clinicId: auth.clinicId }, select: { id: true } });
      if (!patient) return NextResponse.json({ error: "Patient not found." }, { status: 404 });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      // Increment first so two simultaneous creates can never share a number.
      const clinic = await tx.clinic.update({
        where: { id: auth.clinicId },
        data: { nextInvoiceNumber: { increment: 1 } },
        select: { nextInvoiceNumber: true, invoicePrefix: true, taxRateBps: true, taxLabel: true },
      });
      const n = clinic.nextInvoiceNumber - 1;
      const totals = computeTotals(body.lines, clinic.taxRateBps);
      return tx.invoice.create({
        data: {
          clinicId: auth.clinicId,
          number: `${clinic.invoicePrefix}-${String(n).padStart(4, "0")}`,
          patientId: body.patientId ?? null,
          billToName: body.billToName,
          billToEmail: body.billToEmail || null,
          issueDate: body.issueDate,
          dueDate: body.dueDate ?? null,
          notes: body.notes?.trim() || null,
          taxRateBps: clinic.taxRateBps,
          taxLabel: clinic.taxLabel,
          ...totals,
          createdById: auth.userId,
          lines: { create: body.lines.map((l, i) => ({ ...l, position: i })) },
        },
        select: { id: true, number: true },
      });
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Clinic invoices POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
