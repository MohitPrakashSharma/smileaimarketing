import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const clinic = await prisma.clinic.findUnique({
      where: { id },
      include: {
        users: { orderBy: [{ role: "asc" }, { createdAt: "asc" }] },
        _count: { select: { patients: true, inventoryItems: true, invoices: true, socialPosts: true } },
      },
    });
    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

    const { users, _count, ...rest } = clinic;
    return NextResponse.json({
      clinic: rest,
      counts: _count,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        hasPassword: !!u.passwordHash,
        inviteExpiresAt: u.inviteExpiresAt,
        lastLoginAt: u.lastLoginAt,
      })),
    });
  } catch (error) {
    console.error("Admin clinic GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const optional = z.string().trim().max(200).nullable().optional().transform((v) => (v === undefined ? undefined : v || null));

const patchSchema = z.object({
  name: z.string().trim().min(1, "Clinic name is required.").max(160).optional(),
  email: z.union([z.string().trim().email("Clinic email isn't valid."), z.literal(""), z.null()]).optional().transform((v) => (v === undefined ? undefined : v || null)),
  phone: optional,
  address: optional,
  city: optional,
  province: optional,
  website: optional,
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const result = patchSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const exists = await prisma.clinic.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Clinic not found" }, { status: 404 });

    const clinic = await prisma.clinic.update({ where: { id }, data: result.data });
    return NextResponse.json({ clinic });
  } catch (error) {
    console.error("Admin clinic PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
