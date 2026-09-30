import type { Prisma } from "@prisma/client";

/** Shared by the patient list and its CSV export so both honour the same filters. */
export function patientSearchWhere(clinicId: string, url: URL): Prisma.PatientWhereInput {
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const where: Prisma.PatientWhereInput = { clinicId };
  if (status === "ACTIVE" || status === "INACTIVE") where.status = status;
  if (q) {
    const terms = q.split(/\s+/).slice(0, 4);
    where.AND = terms.map((t) => ({
      OR: [
        { firstName: { contains: t, mode: "insensitive" } },
        { lastName: { contains: t, mode: "insensitive" } },
        { email: { contains: t, mode: "insensitive" } },
        { phone: { contains: t } },
      ],
    }));
  }
  return where;
}
