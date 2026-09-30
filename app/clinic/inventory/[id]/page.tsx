"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { InfoRow } from "@/components/admin/InfoRow";
import Button from "@/components/ui/Button";
import { IconBox, IconClock, IconPencil, IconStorefront, IconMapPin, IconFileText, IconAlertTriangle } from "@/components/icons";
import { ItemForm } from "@/components/clinic/inventory/ItemForm";
import { StockDialog, type StockAction } from "@/components/clinic/inventory/StockDialog";
import { StockActions } from "@/components/clinic/inventory/StockActions";
import { isLowStock, type InventoryItem, type InventoryMovement } from "@/components/clinic/inventory/types";
import { formatDateTime } from "@/components/clinic/patients/Drawer";
import { formatMoney } from "@/lib/money";

const TYPE_LABEL: Record<InventoryMovement["type"], string> = { RECEIVED: "Received", USED: "Used", ADJUSTMENT: "Count adjusted" };

export default function InventoryItemPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<(InventoryItem & { movements: InventoryMovement[] }) | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [action, setAction] = useState<StockAction | null>(null);
  const [archiving, setArchiving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinic/inventory/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load this item");
      setItem(data.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this item");
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const toggleArchive = async () => {
    if (!item) return;
    setArchiving(true);
    setError("");
    try {
      const res = await fetch(`/api/clinic/inventory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: !item.archived }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update this item");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update this item");
    } finally {
      setArchiving(false);
    }
  };

  if (error && !item) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="font-semibold text-foreground">{error}</p>
        <Link href="/clinic/inventory" className="mt-2 inline-block text-sm font-semibold text-primary-ink hover:underline">
          Back to inventory
        </Link>
      </div>
    );
  }
  if (!item) return <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  const low = !item.archived && isLowStock(item);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-heading-3 font-bold text-foreground">{item.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[item.category, item.sku].filter(Boolean).join(" · ") || "Uncategorised"}
            {item.archived && <span className="ml-2 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold">Archived</span>}
          </p>
        </div>
        <Link href="/clinic/inventory" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← All inventory
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-5">
          <div className={`admin-card p-5 ${low ? "border-warning/40" : ""}`}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">In stock</p>
            <p className={`mt-2 font-display text-heading-2 font-bold ${low ? "text-warning" : "text-foreground"}`}>
              {item.quantity} <span className="text-base font-semibold text-muted-foreground">{item.unit}</span>
            </p>
            {low && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-warning">
                <IconAlertTriangle className="h-4 w-4" /> At or below the reorder level of {item.reorderLevel}
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Value {item.unitCostCents == null ? "unknown — no unit cost set" : formatMoney(item.quantity * item.unitCostCents)}
            </p>
            {!item.archived && (
              <div className="mt-4">
                <StockActions onAction={setAction} />
              </div>
            )}
          </div>

          <AdminCard
            title="Details"
            icon={IconBox}
            action={
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
              >
                <IconPencil className="h-4 w-4" /> Edit
              </button>
            }
          >
            <div className="-my-3.5 divide-y divide-border/60">
              <InfoRow Icon={IconAlertTriangle} label="Reorder at">
                {item.reorderLevel} {item.unit}
              </InfoRow>
              <InfoRow Icon={IconFileText} label="Unit cost">
                {formatMoney(item.unitCostCents)}
              </InfoRow>
              <InfoRow Icon={IconStorefront} label="Supplier">
                {item.supplier || "—"}
              </InfoRow>
              <InfoRow Icon={IconMapPin} label="Storage location">
                {item.location || "—"}
              </InfoRow>
            </div>
            {item.notes && <p className="mt-6 whitespace-pre-wrap rounded-xl bg-surface-muted/60 p-4 text-sm text-foreground">{item.notes}</p>}
            <div className="mt-6 border-t border-border pt-4">
              <Button variant={item.archived ? "secondary" : "ghost"} size="sm" onClick={toggleArchive} loading={archiving} disabled={archiving}>
                {item.archived ? "Restore item" : "Archive item"}
              </Button>
              {!item.archived && <p className="mt-1 text-xs text-muted-foreground">Hides it from the stock list. History is kept.</p>}
            </div>
          </AdminCard>
        </div>

        <AdminCard title="Stock history" icon={IconClock} count={item.movements.length} flush>
          {item.movements.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No stock changes yet" message="Receiving, using or recounting this item will be logged here." />
            </div>
          ) : (
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[520px] border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">When</th>
                    <th className="bg-surface-muted/70 px-3 py-3">Activity</th>
                    <th className="bg-surface-muted/70 px-3 py-3 text-right">Change</th>
                    <th className="bg-surface-muted/70 px-3 py-3 text-right">After</th>
                    <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {item.movements.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap px-3 py-3 text-foreground">{formatDateTime(m.createdAt)}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{TYPE_LABEL[m.type]}</p>
                        {m.note && <p className="text-[11px] text-muted-foreground">{m.note}</p>}
                      </td>
                      <td className={`px-3 py-3 text-right font-bold ${m.change > 0 ? "text-growth-ink" : "text-danger"}`}>
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground">{m.quantityAfter}</td>
                      <td className="px-3 py-3 text-foreground">{m.createdBy?.name ?? "Removed user"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {editOpen && (
        <ItemForm
          open={editOpen}
          item={item}
          categories={item.category ? [item.category] : []}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            load();
          }}
        />
      )}
      {action && (
        <StockDialog
          item={item}
          action={action}
          onClose={() => setAction(null)}
          onDone={() => {
            setAction(null);
            load();
          }}
        />
      )}
    </div>
  );
}
