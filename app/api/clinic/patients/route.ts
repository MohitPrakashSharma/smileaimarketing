import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { patientInputSchema } from "@/components/clinic/patients/patientSchema";
import { patientSearchWhere } from "@/components/clinic/patients/patientQuery";

const SORTS: Record<string, Prisma.PatientOrderByWithRelationInput[]> = {
  name: [{ lastName: "asc" }, { firstName: "asc" }],
  recent: [{ createdAt: "desc" }],
  lastVisit: [{ lastVisitAt: { sort: "desc", nulls: "last" } }],
  nextVisit: [{ nextVisitAt: { sort: "asc", nulls: "last" } }],
};

export async function GET(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const url = new URL(request.url);
    const orderBy = SORTS[url.searchParams.get("sort") ?? "name"] ?? SORTS.name;
    const where = patientSearchWhere(auth.clinicId, url);
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({ where, orderBy, take: 500 }),
      prisma.patient.count({ where: { clinicId: auth.clinicId } }),
    ]);
    return NextResponse.json({ patients, total });
  } catch (error) {
    console.error("Clinic patients GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = patientInputSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const patient = await prisma.patient.create({ data: { ...result.data, clinicId: auth.clinicId } });
    return NextResponse.json({ patient }, { status: 201 });
  } catch (error) {
    console.error("Clinic patients POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
