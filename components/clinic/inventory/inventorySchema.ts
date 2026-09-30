import { z } from "zod";

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

export const itemInputSchema = z.object({
  name: z.string().trim().min(1, "Item name is required").max(160),
  sku: optionalText(80),
  category: optionalText(80),
  unit: z.string().trim().min(1).max(30).optional(),
  reorderLevel: z.number().int().min(0).max(1_000_000).optional(),
  unitCostCents: z.union([z.number().int().min(0).max(100_000_000), z.null()]).optional(),
  supplier: optionalText(160),
  location: optionalText(120),
  notes: optionalText(2000),
});

/** Creation may set an opening quantity, recorded as the first RECEIVED movement. */
export const itemCreateSchema = itemInputSchema.extend({
  quantity: z.number().int().min(0).max(1_000_000).optional(),
});

export const itemUpdateSchema = itemInputSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const movementSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("RECEIVED"), quantity: z.number().int().min(1).max(1_000_000), note: optionalText(300) }),
  z.object({ type: z.literal("USED"), quantity: z.number().int().min(1).max(1_000_000), note: optionalText(300) }),
  // ADJUSTMENT sets the counted quantity; the signed change is derived.
  z.object({ type: z.literal("ADJUSTMENT"), countedQuantity: z.number().int().min(0).max(1_000_000), note: optionalText(300) }),
]);
