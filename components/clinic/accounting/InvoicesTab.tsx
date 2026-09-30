"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { buttonClasses } from "@/components/ui/Button";
import { IconFileText } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { ErrorBanner, TH, api, formatDay, type MoneySettings } from "./shared";

type InvoiceRow = {
  id: string;
  number: string;
  billToName: string;
  billToEmail: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "VOID";
  issueDate: string;
  dueDate: string | null;
  totalCents: number;
  paidAt: string | null;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Drafts" },
  { value: "SENT", label: "Unpaid" },
  { value: "PAID", label: "Paid" },
  { value: "VOID", label: "Void" },
];

export default function InvoicesTab() {
  const [status, setStatus] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [clinic, setClinic] = useState<MoneySettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<{ invoices: InvoiceRow[]; clinic: MoneySettings }>(`/api/clinic/accounting/invoices${status ? `?status=${status}` : ""}`)
      .then((d) => {
        if (cancelled) return;
        setInvoices(d.invoices);
        setClinic(d.clinic);
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [status]);

  const [now] = useState(() => Date.now());

  return (
    <AdminCard
      title="Invoices"
      icon={IconFileText}
      count={invoices?.length}
      action={
        <Link href="/clinic/accounting/invoices/new" className={buttonClasses({ variant: "dark", size: "sm" })}>
          + New invoice
        </Link>
      }
      flush
    >
      <div className="flex flex-wrap gap-2 border-b border-border px-5 py-3" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              if (f.value === status) return;
              setInvoices(null);
              setStatus(f.value);
            }}
            aria-pressed={status === f.value}
            className={`min-h-9 rounded-full px-4 text-xs font-semibold transition-colors ${
              status === f.value ? "bg-background-dark text-white" : "border border-border text-foreground-secondary hover:bg-surface-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="p-3">
        <ErrorBanner message={error} />
        {invoices === null ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : invoices.length === 0 ? (
          <EmptyState
            title={status ? "No invoices with this status" : "No invoices yet"}
            message={status ? "" : "Create an invoice for a patient and send it by email or print it."}
            compact={false}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className={`${TH} rounded-l-xl`}>Invoice</th>
                  <th className={TH}>Billed to</th>
                  <th className={TH}>Issued</th>
                  <th className={TH}>Due</th>
                  <th className={`${TH} text-right`}>Total</th>
                  <th className={`${TH} rounded-r-xl text-right`}>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {invoices.map((inv) => {
                  const overdue = inv.status === "SENT" && inv.dueDate && new Date(inv.dueDate).getTime() < now;
                  return (
                    <tr key={inv.id} className="transition-colors hover:bg-surface-muted/40">
                      <td className="px-3 py-3">
                        <Link href={`/clinic/accounting/invoices/${inv.id}`} className="font-bold text-foreground hover:text-primary-ink hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-foreground">{inv.billToName}</p>
                        {inv.billToEmail && <p className="text-[11px] text-muted-foreground">{inv.billToEmail}</p>}
                      </td>
                      <td className="px-3 py-3 text-foreground-secondary">{formatDay(inv.issueDate)}</td>
                      <td className={`px-3 py-3 ${overdue ? "font-semibold text-danger" : "text-foreground-secondary"}`}>
                        {formatDay(inv.dueDate)}
                        {overdue && <span className="block text-[11px]">Overdue</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-foreground">{formatMoney(inv.totalCents, clinic?.currency)}</td>
                      <td className="px-3 py-3 text-right">
                        <InvoiceStatus status={inv.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminCard>
  );
}

const STATUS_LABEL: Record<InvoiceRow["status"], { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-secondary/10 border-secondary/30 text-secondary-ink" },
  SENT: { label: "Unpaid", cls: "bg-warning/10 border-warning/30 text-warning" },
  PAID: { label: "Paid", cls: "bg-growth/10 border-growth/30 text-growth-ink" },
  VOID: { label: "Void", cls: "bg-surface-muted border-border text-muted-foreground" },
};

export function InvoiceStatus({ status }: { status: InvoiceRow["status"] }) {
  const s = STATUS_LABEL[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${s.cls}`}>{s.label}</span>
  );
}
