import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";

type Ctx = { params: Promise<{ id: string }> };

/** Voids the invoice and removes any income it had booked. */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const invoice = await prisma.invoice.findFirst({ where: { id, clinicId: auth.clinicId }, select: { status: true } });
    if (!invoice) return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    if (invoice.status === "VOID") return NextResponse.json({ error: "This invoice is already void." }, { status: 409 });

    await prisma.$transaction([
      prisma.ledgerEntry.deleteMany({ where: { invoiceId: id, clinicId: auth.clinicId } }),
      prisma.invoice.update({ where: { id }, data: { status: "VOID" } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clinic invoice void error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
