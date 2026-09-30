import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { patientSearchWhere } from "@/components/clinic/patients/patientQuery";

function csvCell(v: unknown) {
  if (v == null) return "";
  let s = v instanceof Date ? v.toISOString().slice(0, 10) : Array.isArray(v) ? v.join("; ") : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const patients = await prisma.patient.findMany({
      where: patientSearchWhere(auth.clinicId, new URL(request.url)),
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const header = ["First name", "Last name", "Email", "Phone", "Date of birth", "Address", "Status", "Tags", "Last visit", "Next visit", "Notes", "Added"];
    const rows = patients.map((p) =>
      [p.firstName, p.lastName, p.email, p.phone, p.dateOfBirth, p.address, p.status, p.tags, p.lastVisitAt, p.nextVisitAt, p.notes, p.createdAt]
        .map(csvCell)
        .join(",")
    );
    const csv = [header.join(","), ...rows].join("\r\n");
    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="patients-${date}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Clinic patients export error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
