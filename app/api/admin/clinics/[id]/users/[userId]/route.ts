import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

const patchSchema = z.object({ active: z.boolean() });

/** Superadmin can switch a clinic user's access on or off; roles are the clinic owner's call. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, userId } = await params;

    const result = patchSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const user = await prisma.clinicUser.findFirst({ where: { id: userId, clinicId: id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updated = await prisma.clinicUser.update({ where: { id: userId }, data: { active: result.data.active } });
    return NextResponse.json({ user: { id: updated.id, active: updated.active } });
  } catch (error) {
    console.error("Admin clinic user PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
