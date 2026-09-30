import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { itemUpdateSchema } from "@/components/clinic/inventory/inventorySchema";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const item = await prisma.inventoryItem.findFirst({
      where: { id, clinicId: auth.clinicId },
      include: {
        movements: {
          orderBy: { createdAt: "desc" },
          take: 200,
          include: { createdBy: { select: { name: true } } },
        },
      },
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Clinic inventory item GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Edits item details or archives/restores it. Quantity only changes through movements. */
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const result = itemUpdateSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { count } = await prisma.inventoryItem.updateMany({ where: { id, clinicId: auth.clinicId }, data: result.data });
    if (count === 0) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Clinic inventory item PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
