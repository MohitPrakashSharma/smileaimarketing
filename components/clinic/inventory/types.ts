export type InventoryItem = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  unitCostCents: number | null;
  supplier: string | null;
  location: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InventoryMovement = {
  id: string;
  type: "RECEIVED" | "USED" | "ADJUSTMENT";
  change: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
};

export const isLowStock = (i: Pick<InventoryItem, "quantity" | "reorderLevel">) => i.quantity <= i.reorderLevel;
