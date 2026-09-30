"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button, { buttonClasses } from "@/components/ui/Button";
import { IconFileText, IconTrash, IconUser, IconClose } from "@/components/icons";
import { centsToInput, formatMoney, taxOn, toCents } from "@/lib/money";
import { ErrorBanner, api, dayString, formatRate, todayString, type MoneySettings } from "./shared";

type PatientOption = { id: string; firstName: string; lastName: string; email: string | null; phone: string | null };

type LineDraft = { key: number; description: string; quantity: string; price: string; taxable: boolean };

export type InvoiceFormInitial = {
  id: string;
  patient: PatientOption | null;
  billToName: string;
  billToEmail: string | null;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  lines: { description: string; quantity: number; unitPriceCents: number; taxable: boolean }[];
};

let lineKey = 0;
const blankLine = (): LineDraft => ({ key: ++lineKey, description: "", quantity: "1", price: "", taxable: false });

function addDays(day: string, days: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceForm({ initial }: { initial?: InvoiceFormInitial }) {
  const router = useRouter();
  const [clinic, setClinic] = useState<MoneySettings | null>(null);
  const [patient, setPatient] = useState<PatientOption | null>(initial?.patient ?? null);
  const [billToName, setBillToName] = useState(initial?.billToName ?? "");
  const [billToEmail, setBillToEmail] = useState(initial?.billToEmail ?? "");
  const [issueDate, setIssueDate] = useState(initial ? dayString(initial.issueDate) : todayString());
  const [dueDate, setDueDate] = useState(initial ? dayString(initial.dueDate) : addDays(todayString(), 30));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() =>
    initial?.lines.length
      ? initial.lines.map((l) => ({
          key: ++lineKey,
          description: l.description,
          quantity: String(l.quantity),
          price: centsToInput(l.unitPriceCents),
          taxable: l.taxable,
        }))
      : [blankLine()]
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Patient search
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<PatientOption[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ clinic: MoneySettings }>("/api/clinic/accounting/settings")
      .then((d) => setClinic(d.clinic))
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => {
      api<{ patients: PatientOption[] }>(`/api/clinic/accounting/patient-options?q=${encodeURIComponent(query)}`)
        .then((d) => setOptions(d.patients))
        .catch(() => setOptions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query, searchOpen]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pickPatient = (p: PatientOption) => {
    setPatient(p);
    setBillToName(`${p.firstName} ${p.lastName}`);
    setBillToEmail(p.email ?? "");
    setQuery("");
    setSearchOpen(false);
  };

  const updateLine = (key: number, patch: Partial<LineDraft>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const rate = clinic?.taxRateBps ?? 0;
  const parsedLines = lines.map((l) => ({
    ...l,
    qty: Number.parseInt(l.quantity, 10),
    cents: toCents(l.price),
  }));
  let subtotal = 0;
  let taxable = 0;
  for (const l of parsedLines) {
    if (!Number.isFinite(l.qty) || l.cents == null) continue;
    subtotal += l.qty * l.cents;
    if (l.taxable) taxable += l.qty * l.cents;
  }
  const tax = taxOn(taxable, rate);
  const money = (c: number) => formatMoney(c, clinic?.currency);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const filled = parsedLines.filter((l) => l.description.trim() || l.price.trim());
    if (!billToName.trim()) return setError("Who is this invoice for? Pick a patient or type a name.");
    if (filled.length === 0) return setError("Add at least one line item.");
    for (const l of filled) {
      if (!l.description.trim()) return setError("Every line needs a description.");
      if (!Number.isFinite(l.qty) || l.qty < 1) return setError(`Check the quantity on “${l.description}”.`);
      if (l.cents == null || l.cents < 0) return setError(`Check the price on “${l.description}”.`);
    }
    if (dueDate && dueDate < issueDate) return setError("The due date is before the issue date.");

    setSaving(true);
    const body = {
      patientId: patient?.id ?? null,
      billToName: billToName.trim(),
      billToEmail: billToEmail.trim() || null,
      issueDate,
      dueDate: dueDate || null,
      notes: notes.trim() || null,
      lines: filled.map((l) => ({ description: l.description.trim(), quantity: l.qty, unitPriceCents: l.cents!, taxable: l.taxable })),
    };
    try {
      if (initial) {
        await api(`/api/clinic/accounting/invoices/${initial.id}`, { method: "PATCH", json: body });
        router.push(`/clinic/accounting/invoices/${initial.id}`);
      } else {
        const d = await api<{ invoice: { id: string } }>("/api/clinic/accounting/invoices", { method: "POST", json: body });
        router.push(`/clinic/accounting/invoices/${d.invoice.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the invoice");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/clinic/accounting?tab=invoices" className="text-sm text-muted-foreground hover:text-foreground">
            ← Invoices
          </Link>
          <h1 className="mt-1 font-display text-heading-3 font-semibold text-foreground">{initial ? "Edit draft invoice" : "New invoice"}</h1>
        </div>
      </div>

      <ErrorBanner message={error} />

      <AdminCard title="Billed to" icon={IconUser}>
        <div className="space-y-4">
          <div ref={searchRef} className="relative">
            <label htmlFor="patient-search" className="mb-2 block text-field-label text-foreground">
              Patient
            </label>
            {patient ? (
              <div className="flex min-h-[var(--control-height)] items-center justify-between gap-3 rounded-[var(--radius-small)] border border-border bg-surface-muted/50 px-4">
                <span className="text-sm">
                  <span className="font-semibold text-foreground">
                    {patient.firstName} {patient.lastName}
                  </span>
                  {patient.email && <span className="ml-2 text-muted-foreground">{patient.email}</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setPatient(null)}
                  aria-label="Remove patient"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                >
                  <IconClose className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Input
                  id="patient-search"
                  type="search"
                  autoComplete="off"
                  placeholder="Search your patients by name, email or phone"
                  value={query}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                />
                {searchOpen && (
                  <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                    {options.length === 0 ? (
                      <li className="px-3 py-2.5 text-sm text-muted-foreground">
                        {query ? "No matching patients. Type the name below instead." : "No patients yet. Type the name below instead."}
                      </li>
                    ) : (
                      options.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => pickPatient(p)}
                            className="flex min-h-11 w-full flex-col justify-center rounded-xl px-3 py-1.5 text-left hover:bg-surface-muted"
                          >
                            <span className="text-sm font-semibold text-foreground">
                              {p.firstName} {p.lastName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">{[p.email, p.phone].filter(Boolean).join(" · ") || "No contact details"}</span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="bill-name" label="Name on invoice" required optionalLabel={false}>
              <Input id="bill-name" value={billToName} onChange={(e) => setBillToName(e.target.value)} required />
            </FormField>
            <FormField id="bill-email" label="Email" hint="The invoice is emailed here when you send it.">
              <Input id="bill-email" type="email" value={billToEmail} onChange={(e) => setBillToEmail(e.target.value)} />
            </FormField>
            <FormField id="issue-date" label="Issue date" required optionalLabel={false}>
              <Input id="issue-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </FormField>
            <FormField id="due-date" label="Due date">
              <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Line items" icon={IconFileText} subtitle={clinic ? `${clinic.taxLabel} ${formatRate(clinic.taxRateBps)} applies to lines marked taxable` : undefined}>
        <div className="space-y-3">
          <div className="hidden grid-cols-[1fr_80px_120px_80px_110px_40px] gap-3 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Description</span>
            <span>Qty</span>
            <span>Unit price</span>
            <span className="text-center">Taxable</span>
            <span className="text-right">Amount</span>
            <span />
          </div>
          {parsedLines.map((l, i) => (
            <div
              key={l.key}
              className="grid grid-cols-2 gap-3 rounded-2xl border border-border p-3 md:grid-cols-[1fr_80px_120px_80px_110px_40px] md:items-center md:border-0 md:p-0"
            >
              <div className="col-span-2 md:col-span-1">
                <label htmlFor={`desc-${l.key}`} className="sr-only">
                  Description, line {i + 1}
                </label>
                <Input
                  id={`desc-${l.key}`}
                  placeholder="e.g. Scale and polish"
                  value={l.description}
                  onChange={(e) => updateLine(l.key, { description: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor={`qty-${l.key}`} className="mb-1 block text-xs text-muted-foreground md:sr-only">
                  Qty
                </label>
                <Input id={`qty-${l.key}`} inputMode="numeric" value={l.quantity} onChange={(e) => updateLine(l.key, { quantity: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`price-${l.key}`} className="mb-1 block text-xs text-muted-foreground md:sr-only">
                  Unit price
                </label>
                <Input id={`price-${l.key}`} inputMode="decimal" placeholder="0.00" value={l.price} onChange={(e) => updateLine(l.key, { price: e.target.value })} />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm md:justify-center">
                <input type="checkbox" checked={l.taxable} onChange={(e) => updateLine(l.key, { taxable: e.target.checked })} className="h-4 w-4" />
                <span className="md:sr-only">Taxable</span>
              </label>
              <p className="flex items-center justify-end text-sm font-semibold tabular-nums text-foreground">
                {Number.isFinite(l.qty) && l.cents != null ? money(l.qty * l.cents) : "—"}
              </p>
              <div className="col-span-2 flex justify-end md:col-span-1">
                <button
                  type="button"
                  onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [blankLine()]))}
                  aria-label={`Remove line ${i + 1}`}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-danger/10 hover:text-danger"
                >
                  <IconTrash className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLines((ls) => [...ls, blankLine()])} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            + Add line
          </button>

          <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                {clinic?.taxLabel ?? "Tax"} {clinic ? formatRate(rate) : ""}
              </dt>
              <dd className="tabular-nums">{money(tax)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{money(subtotal + tax)}</dd>
            </div>
          </dl>
        </div>
      </AdminCard>

      <AdminCard title="Notes">
        <FormField id="notes" label="Note printed on the invoice">
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Thank you for visiting. Payment accepted by e-transfer." />
        </FormField>
      </AdminCard>

      <div className="flex flex-wrap justify-end gap-3">
        <Link href={initial ? `/clinic/accounting/invoices/${initial.id}` : "/clinic/accounting?tab=invoices"} className={buttonClasses({ variant: "secondary" })}>
          Cancel
        </Link>
        <Button type="submit" loading={saving} disabled={saving || !clinic}>
          {initial ? "Save draft" : "Create draft"}
        </Button>
      </div>
    </form>
  );
}
