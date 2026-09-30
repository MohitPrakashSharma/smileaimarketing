"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { Drawer, FormError } from "@/components/clinic/patients/Drawer";
import type { InventoryItem } from "./types";

export type StockAction = "RECEIVED" | "USED" | "ADJUSTMENT";

const COPY: Record<StockAction, { title: string; field: string; button: string }> = {
  RECEIVED: { title: "Receive stock", field: "Quantity received", button: "Add to stock" },
  USED: { title: "Use stock", field: "Quantity used", button: "Remove from stock" },
  ADJUSTMENT: { title: "Adjust count", field: "Counted quantity", button: "Save count" },
};

/** Records one stock movement against an item. Mount only while open. */
export function StockDialog({
  item,
  action,
  onClose,
  onDone,
}: {
  item: InventoryItem | null;
  action: StockAction | null;
  onClose: () => void;
  onDone: (item: InventoryItem) => void;
}) {
  const [amount, setAmount] = useState(action === "ADJUSTMENT" && item ? String(item.quantity) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const open = !!item && !!action;

  if (!item || !action) return null;
  const copy = COPY[action];
  const n = Number(amount);
  const valid = /^\d+$/.test(amount.trim()) && (action === "ADJUSTMENT" ? n >= 0 : n >= 1);
  const after = !valid ? null : action === "RECEIVED" ? item.quantity + n : action === "USED" ? item.quantity - n : n;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!valid) return setError(action === "ADJUSTMENT" ? "Enter the counted quantity." : "Enter a whole number of at least 1.");
    if (after != null && after < 0) return setError(`Only ${item.quantity} ${item.unit} in stock.`);
    setSaving(true);
    try {
      const body = action === "ADJUSTMENT" ? { type: action, countedQuantity: n, note } : { type: action, quantity: n, note };
      const res = await fetch(`/api/clinic/inventory/${item.id}/movements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't record this");
      onDone(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record this");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={copy.title}
      subtitle={`${item.name} · ${item.quantity} ${item.unit} in stock`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => submit()} loading={saving} disabled={saving}>
            {copy.button}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <FormField id="s-amount" label={copy.field} required>
          <Input id="s-amount" type="number" min={0} step={1} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <FormField
          id="s-note"
          label="Note"
          hint={action === "RECEIVED" ? "e.g. supplier invoice number" : action === "USED" ? "e.g. what it was used for" : "e.g. monthly count"}
        >
          <Input id="s-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} autoComplete="off" />
        </FormField>
        <div className="rounded-xl bg-surface-muted/60 p-4 text-sm">
          <span className="text-muted-foreground">Stock after this: </span>
          <span className={`font-semibold ${after != null && after < 0 ? "text-danger" : "text-foreground"}`}>
            {after == null ? "—" : `${after} ${item.unit}`}
          </span>
        </div>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}
