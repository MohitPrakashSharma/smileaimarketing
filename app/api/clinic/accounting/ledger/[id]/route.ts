import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { ledgerBodySchema } from "@/lib/clinicInvoice.server";

type Ctx = { params: Promise<{ id: string }> };

async function findEditable(id: string, clinicId: string) {
  const entry = await prisma.ledgerEntry.findFirst({ where: { id, clinicId }, select: { invoiceId: true } });
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  // Invoice income is owned by the invoice — change it there (void) so the two never disagree.
  if (entry.invoiceId) {
    return NextResponse.json({ error: "This entry comes from an invoice. Change it from the invoice instead." }, { status: 409 });
  }
  return null;
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    const blocked = await findEditable(id, auth.clinicId);
    if (blocked) return blocked;
    const parsed = ledgerBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const entry = await prisma.ledgerEntry.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ entry });
  } catch (error) {
    console.error("Clinic ledger PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const blocked = await findEditable(id, auth.clinicId);
  if (blocked) return blocked;
  await prisma.ledgerEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
