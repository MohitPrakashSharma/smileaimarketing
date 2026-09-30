import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { itemCreateSchema } from "@/components/clinic/inventory/inventorySchema";

export async function GET(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim();
    const category = url.searchParams.get("category")?.trim();
    const lowStock = url.searchParams.get("lowStock") === "1";
    const archived = url.searchParams.get("archived") === "1";

    const where: Prisma.InventoryItemWhereInput = { clinicId: auth.clinicId, archived };
    if (category) where.category = category;
    if (lowStock) where.quantity = { lte: prisma.inventoryItem.fields.reorderLevel };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
        { supplier: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, categoryRows, active] = await Promise.all([
      prisma.inventoryItem.findMany({ where, orderBy: [{ name: "asc" }], take: 1000 }),
      prisma.inventoryItem.findMany({
        where: { clinicId: auth.clinicId, archived: false, category: { not: null } },
        distinct: ["category"],
        select: { category: true },
        orderBy: { category: "asc" },
      }),
      prisma.inventoryItem.findMany({
        where: { clinicId: auth.clinicId, archived: false },
        select: { quantity: true, reorderLevel: true, unitCostCents: true },
      }),
    ]);

    const summary = {
      itemCount: active.length,
      lowStockCount: active.filter((i) => i.quantity <= i.reorderLevel).length,
      // Only items with a known unit cost contribute; the count of the rest is reported so the total isn't mistaken for complete.
      stockValueCents: active.reduce((sum, i) => sum + (i.unitCostCents != null ? i.quantity * i.unitCostCents : 0), 0),
      uncostedCount: active.filter((i) => i.unitCostCents == null).length,
    };

    return NextResponse.json({ items, categories: categoryRows.map((c) => c.category as string), summary });
  } catch (error) {
    console.error("Clinic inventory GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const result = itemCreateSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { quantity = 0, ...data } = result.data;
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({ data: { ...data, quantity, clinicId: auth.clinicId } });
      if (quantity > 0) {
        await tx.inventoryMovement.create({
          data: {
            clinicId: auth.clinicId,
            itemId: created.id,
            type: "RECEIVED",
            change: quantity,
            quantityAfter: quantity,
            note: "Opening stock",
            createdById: auth.userId,
          },
        });
      }
      return created;
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Clinic inventory POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
