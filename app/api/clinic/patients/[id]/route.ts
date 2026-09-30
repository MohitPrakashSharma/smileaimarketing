import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { patientUpdateSchema } from "@/components/clinic/patients/patientSchema";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const patient = await prisma.patient.findFirst({
      where: { id, clinicId: auth.clinicId },
      include: {
        invoices: {
          where: { clinicId: auth.clinicId },
          orderBy: { issueDate: "desc" },
          select: { id: true, number: true, status: true, totalCents: true, issueDate: true, dueDate: true, paidAt: true },
        },
      },
    });
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Clinic patient GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const result = patientUpdateSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { count } = await prisma.patient.updateMany({ where: { id, clinicId: auth.clinicId }, data: result.data });
    if (count === 0) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const patient = await prisma.patient.findUnique({ where: { id } });
    return NextResponse.json({ patient });
  } catch (error) {
    console.error("Clinic patient PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    // Invoices keep their billTo snapshot; the relation is set to null on delete.
    const { count } = await prisma.patient.deleteMany({ where: { id, clinicId: auth.clinicId } });
    if (count === 0) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clinic patient DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
