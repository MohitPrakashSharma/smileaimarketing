import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword } from "@/lib/auth";
import { setClinicCookie, signClinicToken } from "@/lib/clinicAuth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const result = loginSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    }

    const email = result.data.email.trim().toLowerCase();
    const user = await prisma.clinicUser.findUnique({
      where: { email },
      include: { clinic: { select: { active: true } } },
    });

    // Same message for every failure so the form doesn't reveal which emails exist.
    const invalid = NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    if (!user || !user.passwordHash) return invalid;
    if (!(await comparePassword(result.data.password, user.passwordHash))) return invalid;
    if (!user.active || !user.clinic.active) {
      return NextResponse.json({ error: "This account has been deactivated. Contact your clinic owner." }, { status: 403 });
    }

    await prisma.clinicUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const response = NextResponse.json({ success: true });
    setClinicCookie(response, signClinicToken({ sub: user.id, clinicId: user.clinicId, role: user.role }));
    return response;
  } catch (error) {
    console.error("Clinic login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
