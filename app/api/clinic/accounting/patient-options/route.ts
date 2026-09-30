import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";

/** Patient picker for invoices — this clinic's patients matching the search text. */
export async function GET(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  const words = q.split(/\s+/).filter(Boolean).slice(0, 3);
  const patients = await prisma.patient.findMany({
    where: {
      clinicId: auth.clinicId,
      AND: words.map((w) => ({
        OR: [
          { firstName: { contains: w, mode: "insensitive" as const } },
          { lastName: { contains: w, mode: "insensitive" as const } },
          { email: { contains: w, mode: "insensitive" as const } },
          { phone: { contains: w } },
        ],
      })),
    },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 10,
  });
  return NextResponse.json({ patients });
}
