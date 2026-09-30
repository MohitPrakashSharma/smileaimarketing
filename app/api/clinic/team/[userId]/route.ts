import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";

const patchSchema = z
  .object({
    role: z.enum(["OWNER", "MANAGER", "STAFF"]).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.active !== undefined, "Nothing to change.");

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireClinic(request, "OWNER");
  if (auth instanceof NextResponse) return auth;
  try {
    const { userId } = await params;
    const result = patchSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const target = await prisma.clinicUser.findFirst({ where: { id: userId, clinicId: auth.clinicId } });
    if (!target) return NextResponse.json({ error: "Team member not found" }, { status: 404 });

    const { role, active } = result.data;
    if (target.id === auth.userId && ((role && role !== "OWNER") || active === false)) {
      return NextResponse.json({ error: "You can't demote or deactivate yourself. Ask another owner to do it." }, { status: 400 });
    }

    // The clinic must always keep at least one owner who can sign in.
    const losesOwner = target.role === "OWNER" && ((role && role !== "OWNER") || active === false);
    if (losesOwner) {
      const otherOwners = await prisma.clinicUser.count({
        where: { clinicId: auth.clinicId, role: "OWNER", active: true, passwordHash: { not: null }, id: { not: target.id } },
      });
      if (otherOwners === 0) {
        return NextResponse.json({ error: "The clinic needs at least one active owner." }, { status: 400 });
      }
    }

    const updated = await prisma.clinicUser.update({ where: { id: target.id }, data: { role, active } });
    return NextResponse.json({ member: { id: updated.id, role: updated.role, active: updated.active } });
  } catch (error) {
    console.error("Clinic team PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
