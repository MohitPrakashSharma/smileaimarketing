"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { IconBox, IconSearch, IconAlertTriangle } from "@/components/icons";
import { ItemForm } from "@/components/clinic/inventory/ItemForm";
import { StockDialog, type StockAction } from "@/components/clinic/inventory/StockDialog";
import { StockActions } from "@/components/clinic/inventory/StockActions";
import { isLowStock, type InventoryItem } from "@/components/clinic/inventory/types";
import { formatMoney } from "@/lib/money";

type Summary = { itemCount: number; lowStockCount: number; stockValueCents: number; uncostedCount: number };

function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "warning" }) {
  return (
    <div className="admin-card p-5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-heading-3 font-bold ${tone === "warning" ? "text-warning" : "text-foreground"}`}>{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [archived, setArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [stock, setStock] = useState<{ item: InventoryItem; action: StockAction } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (lowStock) params.set("lowStock", "1");
  if (archived) params.set("archived", "1");
  const qs = params.toString();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinic/inventory?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load inventory");
      setError("");
      setItems(data.items);
      setCategories(data.categories);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load inventory");
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filtered = !!(query || category || lowStock);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-heading-3 font-bold text-foreground">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">Supplies on hand, what&apos;s running low, and every stock change.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>+ Add item</Button>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Items tracked" value={String(summary.itemCount)} />
          <Stat
            label="Low stock"
            value={String(summary.lowStockCount)}
            note={summary.lowStockCount ? "At or below their reorder level" : "Nothing needs reordering"}
            tone={summary.lowStockCount ? "warning" : undefined}
          />
          <Stat
            label="Stock value"
            value={formatMoney(summary.stockValueCents)}
            note={
              summary.uncostedCount ? `${summary.uncostedCount} item${summary.uncostedCount === 1 ? "" : "s"} without a unit cost not counted` : "At unit cost"
            }
          />
        </div>
      )}

      <AdminCard title={archived ? "Archived items" : "Stock"} icon={IconBox} count={items.length} flush>
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search item, SKU or supplier…"
              aria-label="Search inventory"
              className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)} className="!h-11 sm:w-44">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <button
              type="button"
              aria-pressed={lowStock}
              onClick={() => setLowStock((v) => !v)}
              className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
                lowStock ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-foreground hover:bg-surface-muted"
              }`}
            >
              <IconAlertTriangle className="h-4 w-4" /> Low stock
            </button>
            <button
              type="button"
              aria-pressed={archived}
              onClick={() => setArchived((v) => !v)}
              className={`inline-flex h-11 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                archived ? "border-foreground bg-background-dark text-white" : "border-border text-foreground hover:bg-surface-muted"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {error && <p className="p-5 text-sm font-semibold text-danger">{error}</p>}

        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading inventory…</p>
        ) : items.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact={false}
              title={archived ? "No archived items" : filtered ? "Nothing matches" : "No items yet"}
              message={
                archived ? "Items you archive show up here." : filtered ? "Try a different search or filter." : "Add the supplies you want to keep track of."
              }
              action={archived || filtered ? undefined : { label: "Add item", onClick: () => setFormOpen(true) }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">Item</th>
                  <th className="bg-surface-muted/70 px-3 py-3">In stock</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Reorder at</th>
                  <th className="bg-surface-muted/70 px-3 py-3 text-right">Unit cost</th>
                  <th className="bg-surface-muted/70 px-3 py-3 text-right">Value</th>
                  <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3 text-right">{archived ? "" : "Record"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {items.map((i) => {
                  const low = !i.archived && isLowStock(i);
                  return (
                    <tr key={i.id} className={`transition-colors hover:bg-surface-muted/40 ${low ? "bg-warning/5" : ""}`}>
                      <td className="px-3 py-3">
                        <Link href={`/clinic/inventory/${i.id}`} className="font-bold text-foreground hover:text-primary-ink hover:underline">
                          {i.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{[i.category, i.sku, i.supplier].filter(Boolean).join(" · ") || "—"}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`font-semibold ${low ? "text-warning" : "text-foreground"}`}>
                          {i.quantity} {i.unit}
                        </span>
                        {low && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                            Low
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-foreground">{i.reorderLevel}</td>
                      <td className="px-3 py-3 text-right text-foreground">{formatMoney(i.unitCostCents)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-foreground">
                        {i.unitCostCents == null ? "—" : formatMoney(i.quantity * i.unitCostCents)}
                      </td>
                      <td className="px-3 py-3">
                        {!i.archived && (
                          <div className="flex justify-end">
                            <StockActions onAction={(action) => setStock({ item: i, action })} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {formOpen && (
        <ItemForm
          open={formOpen}
          item={null}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
      {stock && (
        <StockDialog
          item={stock.item}
          action={stock.action}
          onClose={() => setStock(null)}
          onDone={() => {
            setStock(null);
            load();
          }}
        />
      )}
    </div>
  );
}
