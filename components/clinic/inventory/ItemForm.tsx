"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { Drawer, FormError } from "@/components/clinic/patients/Drawer";
import { centsToInput, toCents } from "@/lib/money";
import type { InventoryItem } from "./types";

type FormState = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  quantity: string;
  reorderLevel: string;
  unitCost: string;
  supplier: string;
  location: string;
  notes: string;
};

function initial(i?: InventoryItem | null): FormState {
  return {
    name: i?.name ?? "",
    sku: i?.sku ?? "",
    category: i?.category ?? "",
    unit: i?.unit ?? "unit",
    quantity: "0",
    reorderLevel: String(i?.reorderLevel ?? 0),
    unitCost: centsToInput(i?.unitCostCents),
    supplier: i?.supplier ?? "",
    location: i?.location ?? "",
    notes: i?.notes ?? "",
  };
}

const wholeNumber = (v: string) => /^\d+$/.test(v.trim());

/** Create (item = null) or edit an item. Quantity is only set on creation; later changes go through stock movements. Mount only while open. */
export function ItemForm({
  open,
  item,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  item: InventoryItem | null;
  categories: string[];
  onClose: () => void;
  onSaved: (i: InventoryItem) => void;
}) {
  const [form, setForm] = useState<FormState>(initial(item));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Item name is required.");
    if (!wholeNumber(form.reorderLevel)) return setError("Reorder level must be a whole number.");
    if (!item && !wholeNumber(form.quantity)) return setError("Opening quantity must be a whole number.");
    let unitCostCents: number | null = null;
    if (form.unitCost.trim()) {
      unitCostCents = toCents(form.unitCost);
      if (unitCostCents == null || unitCostCents < 0) return setError("Unit cost must be a positive amount.");
    }

    setSaving(true);
    try {
      const body = {
        name: form.name,
        sku: form.sku,
        category: form.category,
        unit: form.unit.trim() || "unit",
        reorderLevel: Number(form.reorderLevel),
        unitCostCents,
        supplier: form.supplier,
        location: form.location,
        notes: form.notes,
        ...(item ? {} : { quantity: Number(form.quantity) }),
      };
      const res = await fetch(item ? `/api/clinic/inventory/${item.id}` : "/api/clinic/inventory", {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save the item");
      onSaved(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the item");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={item ? `Edit ${item.name}` : "Add inventory item"}
      subtitle={item ? "To change the quantity, use Receive, Use or Adjust count." : undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => submit()} loading={saving} disabled={saving}>
            {item ? "Save changes" : "Add item"}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id="i-name" label="Item name" required>
          <Input id="i-name" value={form.name} onChange={set("name")} placeholder="e.g. Nitrile gloves, medium" autoComplete="off" />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="i-category" label="Category">
            <Input id="i-category" list="i-category-list" value={form.category} onChange={set("category")} placeholder="e.g. PPE" autoComplete="off" />
            <datalist id="i-category-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FormField>
          <FormField id="i-sku" label="SKU / product code">
            <Input id="i-sku" value={form.sku} onChange={set("sku")} autoComplete="off" />
          </FormField>
          <FormField id="i-unit" label="Unit" optionalLabel={false} hint="box, pack, bottle…">
            <Input id="i-unit" value={form.unit} onChange={set("unit")} autoComplete="off" />
          </FormField>
          {!item && (
            <FormField id="i-qty" label="Opening quantity" optionalLabel={false}>
              <Input id="i-qty" type="number" min={0} step={1} inputMode="numeric" value={form.quantity} onChange={set("quantity")} />
            </FormField>
          )}
          <FormField id="i-reorder" label="Reorder at" optionalLabel={false} hint="Flagged as low stock at or below this.">
            <Input id="i-reorder" type="number" min={0} step={1} inputMode="numeric" value={form.reorderLevel} onChange={set("reorderLevel")} />
          </FormField>
          <FormField id="i-cost" label="Unit cost (CAD)">
            <Input id="i-cost" inputMode="decimal" value={form.unitCost} onChange={set("unitCost")} placeholder="0.00" />
          </FormField>
          <FormField id="i-supplier" label="Supplier">
            <Input id="i-supplier" value={form.supplier} onChange={set("supplier")} autoComplete="off" />
          </FormField>
          <FormField id="i-location" label="Storage location">
            <Input id="i-location" value={form.location} onChange={set("location")} placeholder="e.g. Op room 2, cabinet B" autoComplete="off" />
          </FormField>
        </div>
        <FormField id="i-notes" label="Notes">
          <Textarea id="i-notes" value={form.notes} onChange={set("notes")} rows={3} />
        </FormField>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}
