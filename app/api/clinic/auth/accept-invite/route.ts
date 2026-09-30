import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { setClinicCookie, signClinicToken } from "@/lib/clinicAuth";

async function findInvite(token: string) {
  const user = await prisma.clinicUser.findUnique({
    where: { inviteToken: token },
    include: { clinic: { select: { name: true, active: true } } },
  });
  if (!user || !user.active || !user.clinic.active) return null;
  if (!user.inviteExpiresAt || user.inviteExpiresAt < new Date()) return null;
  return user;
}

/** Lets the accept page greet the invitee before they choose a password. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const user = token ? await findInvite(token) : null;
  if (!user) {
    return NextResponse.json({ error: "This invite link is invalid or has expired. Ask for a new one." }, { status: 404 });
  }
  return NextResponse.json({ name: user.name, email: user.email, clinicName: user.clinic.name });
}

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  password: z.string().min(8, "Use at least 8 characters."),
});

export async function POST(request: Request) {
  try {
    const result = acceptSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const user = await findInvite(result.data.token);
    if (!user) {
      return NextResponse.json({ error: "This invite link is invalid or has expired. Ask for a new one." }, { status: 404 });
    }

    const updated = await prisma.clinicUser.update({
      where: { id: user.id },
      data: {
        name: result.data.name,
        passwordHash: await hashPassword(result.data.password),
        inviteToken: null,
        inviteExpiresAt: null,
        acceptedAt: new Date(),
        lastLoginAt: new Date(),
      },
    });

    const response = NextResponse.json({ success: true });
    setClinicCookie(response, signClinicToken({ sub: updated.id, clinicId: updated.clinicId, role: updated.role }));
    return response;
  } catch (error) {
    console.error("Clinic accept-invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
