import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { movementSchema } from "@/components/clinic/inventory/inventorySchema";

type Ctx = { params: Promise<{ id: string }> };

class MovementError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const { id } = await params;
    const result = movementSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const input = result.data;

    const outcome = await prisma.$transaction(async (tx) => {
      // Row lock so two people recording stock at once can't both read the same quantity.
      const locked = await tx.$queryRaw<Array<{ quantity: number; archived: boolean }>>`
        SELECT "quantity", "archived" FROM "InventoryItem" WHERE "id" = ${id} AND "clinicId" = ${auth.clinicId} FOR UPDATE`;
      const current = locked[0];
      if (!current) throw new MovementError("Item not found", 404);
      if (current.archived) throw new MovementError("Restore this item before recording stock.", 400);

      let change: number;
      if (input.type === "RECEIVED") change = input.quantity;
      else if (input.type === "USED") {
        if (input.quantity > current.quantity) {
          throw new MovementError(`Only ${current.quantity} in stock — can't use ${input.quantity}.`, 400);
        }
        change = -input.quantity;
      } else {
        change = input.countedQuantity - current.quantity;
        if (change === 0) throw new MovementError("The count matches what's already recorded.", 400);
      }

      const quantityAfter = current.quantity + change;
      const item = await tx.inventoryItem.update({ where: { id }, data: { quantity: quantityAfter } });
      const movement = await tx.inventoryMovement.create({
        data: {
          clinicId: auth.clinicId,
          itemId: id,
          type: input.type,
          change,
          quantityAfter,
          note: input.note ?? null,
          createdById: auth.userId,
        },
        include: { createdBy: { select: { name: true } } },
      });
      return { item, movement };
    });

    return NextResponse.json(outcome, { status: 201 });
  } catch (error) {
    if (error instanceof MovementError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Clinic inventory movement POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
