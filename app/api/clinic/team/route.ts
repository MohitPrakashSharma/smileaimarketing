import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { issueClinicInvite } from "@/lib/clinicInvite.server";

export async function GET(request: Request) {
  const auth = await requireClinic(request, "OWNER");
  if (auth instanceof NextResponse) return auth;
  try {
    const users = await prisma.clinicUser.findMany({
      where: { clinicId: auth.clinicId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({
      members: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        hasPassword: !!u.passwordHash,
        inviteExpiresAt: u.inviteExpiresAt,
        lastLoginAt: u.lastLoginAt,
        isYou: u.id === auth.userId,
      })),
    });
  } catch (error) {
    console.error("Clinic team GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().toLowerCase().email("That email isn't valid."),
  role: z.enum(["OWNER", "MANAGER", "STAFF"]),
});

export async function POST(request: Request) {
  const auth = await requireClinic(request, "OWNER");
  if (auth instanceof NextResponse) return auth;
  try {
    const result = inviteSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { name, email, role } = result.data;

    const existing = await prisma.clinicUser.findUnique({ where: { email }, select: { clinicId: true } });
    if (existing) {
      return NextResponse.json(
        {
          error:
            existing.clinicId === auth.clinicId
              ? `${email} is already on your team.`
              : `${email} already has a dentist panel login at another clinic. Use a different email.`,
        },
        { status: 409 }
      );
    }

    const user = await prisma.clinicUser.create({ data: { clinicId: auth.clinicId, name, email, role } });
    const invite = await issueClinicInvite(user.id);
    return NextResponse.json({ member: { id: user.id }, invite }, { status: 201 });
  } catch (error) {
    console.error("Clinic team POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
