import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { issueClinicInvite } from "@/lib/clinicInvite.server";

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const clinics = await prisma.clinic.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          where: { role: "OWNER" },
          orderBy: { createdAt: "asc" },
          select: { name: true, email: true, active: true, passwordHash: true, inviteExpiresAt: true },
        },
        _count: { select: { users: true, patients: true } },
      },
    });

    return NextResponse.json({
      clinics: clinics.map((c) => {
        const owner = c.users[0];
        return {
          id: c.id,
          name: c.name,
          city: c.city,
          province: c.province,
          active: c.active,
          createdAt: c.createdAt,
          teamSize: c._count.users,
          patientCount: c._count.patients,
          owner: owner
            ? { name: owner.name, email: owner.email, active: owner.active, hasPassword: !!owner.passwordHash, inviteExpiresAt: owner.inviteExpiresAt }
            : null,
        };
      }),
    });
  } catch (error) {
    console.error("Admin clinics GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const optional = z.string().trim().max(200).optional().transform((v) => v || null);

const createSchema = z.object({
  name: z.string().trim().min(1, "Clinic name is required.").max(160),
  email: z.union([z.string().trim().email("Clinic email isn't valid."), z.literal("")]).optional().transform((v) => v || null),
  phone: optional,
  address: optional,
  city: optional,
  province: optional,
  website: optional,
  ownerName: z.string().trim().min(1, "Owner name is required.").max(120),
  ownerEmail: z.string().trim().toLowerCase().email("Owner email isn't valid."),
});

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = createSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { ownerName, ownerEmail, ...clinicData } = result.data;

    const taken = await prisma.clinicUser.findUnique({ where: { email: ownerEmail }, select: { clinic: { select: { name: true } } } });
    if (taken) {
      return NextResponse.json(
        { error: `${ownerEmail} already has a dentist panel login (at ${taken.clinic.name}). Each email can belong to one clinic.` },
        { status: 409 }
      );
    }

    const clinic = await prisma.clinic.create({
      data: { ...clinicData, users: { create: { name: ownerName, email: ownerEmail, role: "OWNER" } } },
      include: { users: { select: { id: true } } },
    });
    const invite = await issueClinicInvite(clinic.users[0].id);

    return NextResponse.json({ clinic: { id: clinic.id, name: clinic.name }, invite }, { status: 201 });
  } catch (error) {
    console.error("Admin clinics POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
