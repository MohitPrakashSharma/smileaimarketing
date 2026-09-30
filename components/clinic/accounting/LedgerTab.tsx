"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button, { buttonClasses } from "@/components/ui/Button";
import { IconPencil, IconReceipt, IconTrash } from "@/components/icons";
import { centsToInput, formatMoney, toCents } from "@/lib/money";
import { ErrorBanner, Modal, TH, api, dayString, formatDay, todayString, type MoneySettings } from "./shared";

type Entry = {
  id: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  description: string | null;
  counterparty: string | null;
  amountCents: number;
  taxCents: number;
  date: string;
  invoiceId: string | null;
  invoice: { id: string; number: string } | null;
};

type Categories = { INCOME: string[]; EXPENSE: string[] };
type Filters = { type: string; category: string; from: string; to: string };

const EMPTY_FILTERS: Filters = { type: "", category: "", from: "", to: "" };

function query(f: Filters) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) p.set(k, v);
  return p.toString();
}

export default function LedgerTab() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [categories, setCategories] = useState<Categories>({ INCOME: [], EXPENSE: [] });
  const [clinic, setClinic] = useState<MoneySettings | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Entry | "new" | null>(null);
  const [deleting, setDeleting] = useState<Entry | null>(null);

  const load = useCallback(() => {
    api<{ entries: Entry[]; categories: Categories; clinic: MoneySettings }>(`/api/clinic/accounting/ledger?${query(filters)}`)
      .then((d) => {
        setEntries(d.entries);
        setCategories(d.categories);
        setClinic(d.clinic);
        setError("");
      })
      .catch((e: Error) => setError(e.message));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const money = (c: number) => formatMoney(c, clinic?.currency);
  const filterCategories = filters.type ? categories[filters.type as "INCOME" | "EXPENSE"] : [...categories.INCOME, ...categories.EXPENSE];
  const totals = (entries ?? []).reduce(
    (t, e) => (e.type === "INCOME" ? { ...t, income: t.income + e.amountCents } : { ...t, expense: t.expense + e.amountCents }),
    { income: 0, expense: 0 }
  );
  const filtered = Object.values(filters).some(Boolean);

  const remove = async () => {
    if (!deleting) return;
    try {
      await api(`/api/clinic/accounting/ledger/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete");
      setDeleting(null);
    }
  };

  return (
    <>
      <AdminCard
        title="Income & expenses"
        icon={IconReceipt}
        count={entries?.length}
        action={
          <>
            <a href={`/api/clinic/accounting/ledger?${query(filters)}${filtered ? "&" : ""}format=csv`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
              Export CSV
            </a>
            <Button variant="dark" size="sm" onClick={() => setEditing("new")}>
              + Add entry
            </Button>
          </>
        }
        flush
      >
        <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 md:grid-cols-[160px_220px_1fr_1fr_auto] md:items-end">
          <div>
            <label htmlFor="f-type" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Type
            </label>
            <Select id="f-type" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, category: "" }))}>
              <option value="">All</option>
              <option value="INCOME">Income</option>
              <option value="EXPENSE">Expenses</option>
            </Select>
          </div>
          <div>
            <label htmlFor="f-cat" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Category
            </label>
            <Select id="f-cat" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
              <option value="">All categories</option>
              {Array.from(new Set(filterCategories)).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="f-from" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              From
            </label>
            <Input id="f-from" type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="f-to" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              To
            </label>
            <Input id="f-to" type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>
          {filtered && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="col-span-2 min-h-11 text-sm font-semibold text-muted-foreground hover:text-foreground md:col-span-1">
              Clear
            </button>
          )}
        </div>

        <div className="p-3">
          <ErrorBanner message={error} />
          {entries === null ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <EmptyState
              title={filtered ? "Nothing matches these filters" : "No entries yet"}
              message={filtered ? "" : "Add expenses like supplies, rent and lab fees. Paid invoices are added as income automatically."}
              compact={false}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left">
                  <thead>
                    <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className={`${TH} rounded-l-xl`}>Date</th>
                      <th className={TH}>Category</th>
                      <th className={TH}>Details</th>
                      <th className={`${TH} text-right`}>Tax</th>
                      <th className={`${TH} text-right`}>Amount</th>
                      <th className={`${TH} rounded-r-xl text-right`}>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-xs">
                    {entries.map((e) => (
                      <tr key={e.id} className="transition-colors hover:bg-surface-muted/40">
                        <td className="whitespace-nowrap px-3 py-3 text-foreground-secondary">{formatDay(e.date)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`mr-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              e.type === "INCOME" ? "bg-growth/10 text-growth-ink" : "bg-danger/10 text-danger"
                            }`}
                          >
                            {e.type === "INCOME" ? "In" : "Out"}
                          </span>
                          <span className="font-semibold text-foreground">{e.category}</span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="text-foreground">{e.description || "—"}</p>
                          {e.counterparty && <p className="text-[11px] text-muted-foreground">{e.counterparty}</p>}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums text-foreground-secondary">{e.taxCents ? money(e.taxCents) : "—"}</td>
                        <td className={`px-3 py-3 text-right font-semibold tabular-nums ${e.type === "INCOME" ? "text-growth-ink" : "text-foreground"}`}>
                          {e.type === "EXPENSE" ? "−" : ""}
                          {money(e.amountCents)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {e.invoice ? (
                            <Link href={`/clinic/accounting/invoices/${e.invoice.id}`} className="text-[11px] font-semibold text-primary-ink hover:underline">
                              {e.invoice.number}
                            </Link>
                          ) : (
                            <span className="inline-flex gap-1">
                              <button
                                onClick={() => setEditing(e)}
                                aria-label="Edit entry"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                              >
                                <IconPencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleting(e)}
                                aria-label="Delete entry"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger"
                              >
                                <IconTrash className="h-4 w-4" />
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex flex-wrap justify-end gap-x-6 gap-y-1 px-3 text-sm">
                <span className="text-muted-foreground">
                  Income <strong className="tabular-nums text-foreground">{money(totals.income)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Expenses <strong className="tabular-nums text-foreground">{money(totals.expense)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Net <strong className={`tabular-nums ${totals.income - totals.expense < 0 ? "text-danger" : "text-foreground"}`}>{money(totals.income - totals.expense)}</strong>
                </span>
              </div>
            </>
          )}
        </div>
      </AdminCard>

      {editing && (
        <EntryModal
          entry={editing === "new" ? null : editing}
          categories={categories}
          clinic={clinic}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}

      {deleting && (
        <Modal title="Delete entry?" onClose={() => setDeleting(null)}>
          <p className="text-sm text-foreground-secondary">
            {deleting.category} · {money(deleting.amountCents)} on {formatDay(deleting.date)} will be removed from your books.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

function EntryModal({
  entry,
  categories,
  clinic,
  onClose,
  onSaved,
}: {
  entry: Entry | null;
  categories: Categories;
  clinic: MoneySettings | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<"INCOME" | "EXPENSE">(entry?.type ?? "EXPENSE");
  const presetList = categories[type];
  const initialCustom = !!entry && !presetList.includes(entry.category);
  const [category, setCategory] = useState(entry ? (initialCustom ? "__custom" : entry.category) : "");
  const [customCategory, setCustomCategory] = useState(initialCustom ? entry!.category : "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [counterparty, setCounterparty] = useState(entry?.counterparty ?? "");
  const [amount, setAmount] = useState(centsToInput(entry?.amountCents));
  const [tax, setTax] = useState(entry?.taxCents ? centsToInput(entry.taxCents) : "");
  const [date, setDate] = useState(entry ? dayString(entry.date) : todayString());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fillTax = () => {
    const total = toCents(amount);
    if (total == null || !clinic) return;
    // Tax portion of a tax-inclusive total: total × r / (1 + r).
    setTax(centsToInput(Math.round((total * clinic.taxRateBps) / (10_000 + clinic.taxRateBps))));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cat = category === "__custom" ? customCategory.trim() : category;
    const amountCents = toCents(amount);
    const taxCents = tax.trim() ? toCents(tax) : 0;
    if (!cat) return setError("Pick a category.");
    if (amountCents == null || amountCents <= 0) return setError("Enter the amount.");
    if (taxCents == null || taxCents < 0) return setError("Check the tax amount.");
    if (taxCents > amountCents) return setError("Tax can't be more than the total amount.");
    setSaving(true);
    try {
      const json = { type, category: cat, description, counterparty, amountCents, taxCents, date };
      if (entry) await api(`/api/clinic/accounting/ledger/${entry.id}`, { method: "PATCH", json });
      else await api("/api/clinic/accounting/ledger", { method: "POST", json });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
      setSaving(false);
    }
  };

  return (
    <Modal title={entry ? "Edit entry" : "Add income or expense"} onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <ErrorBanner message={error} />
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Type">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => {
                setType(t);
                setCategory("");
              }}
              className={`min-h-11 rounded-full text-sm font-semibold transition-colors ${
                type === t ? "bg-background-dark text-white" : "border border-border text-foreground-secondary hover:bg-surface-muted"
              }`}
            >
              {t === "EXPENSE" ? "Expense" : "Income"}
            </button>
          ))}
        </div>
        <FormField id="e-cat" label="Category" required optionalLabel={false}>
          <Select id="e-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="" disabled>
              Choose…
            </option>
            {presetList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="__custom">New category…</option>
          </Select>
        </FormField>
        {category === "__custom" && (
          <FormField id="e-custom" label="Category name" required optionalLabel={false}>
            <Input id="e-custom" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} autoFocus />
          </FormField>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="e-amount" label="Amount incl. tax" required optionalLabel={false}>
            <Input id="e-amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          <FormField id="e-tax" label={`${clinic?.taxLabel ?? "Tax"} portion`}>
            <div className="flex gap-2">
              <Input id="e-tax" inputMode="decimal" placeholder="0.00" value={tax} onChange={(e) => setTax(e.target.value)} />
              {clinic && clinic.taxRateBps > 0 && (
                <button type="button" onClick={fillTax} className="shrink-0 rounded-full border border-border px-3 text-xs font-semibold text-foreground-secondary hover:bg-surface-muted">
                  Calc
                </button>
              )}
            </div>
          </FormField>
          <FormField id="e-date" label="Date" required optionalLabel={false}>
            <Input id="e-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField id="e-party" label={type === "EXPENSE" ? "Vendor" : "Paid by"}>
            <Input id="e-party" value={counterparty} onChange={(e) => setCounterparty(e.target.value)} />
          </FormField>
        </div>
        <FormField id="e-desc" label="Description">
          <Input id="e-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={saving}>
            {entry ? "Save" : "Add entry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
