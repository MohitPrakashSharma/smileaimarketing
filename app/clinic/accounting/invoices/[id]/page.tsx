"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button, { buttonClasses } from "@/components/ui/Button";
import { InvoiceStatus } from "@/components/clinic/accounting/InvoicesTab";
import { ErrorBanner, Modal, PAYMENT_METHODS, api, formatDay, formatRate, todayString } from "@/components/clinic/accounting/shared";
import { formatMoney } from "@/lib/money";

type Invoice = {
  id: string;
  number: string;
  status: "DRAFT" | "SENT" | "PAID" | "VOID";
  billToName: string;
  billToEmail: string | null;
  issueDate: string;
  dueDate: string | null;
  taxRateBps: number;
  taxLabel: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  notes: string | null;
  sentAt: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  lines: { id: string; description: string; quantity: number; unitPriceCents: number; taxable: boolean }[];
  patient: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  ledgerEntry: { id: string } | null;
  clinic: { name: string; email: string | null; phone: string | null; address: string | null; city: string | null; province: string | null; website: string | null; currency: string };
};

type Dialog = "send" | "pay" | "void" | "delete" | null;

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [paidAt, setPaidAt] = useState(todayString());
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [now] = useState(() => Date.now());

  const load = useCallback(() => {
    api<{ invoice: Invoice }>(`/api/clinic/accounting/invoices/${id}`)
      .then((d) => setInvoice(d.invoice))
      .catch((e: Error) => setError(e.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<string | void>) => {
    setBusy(true);
    setError("");
    try {
      const msg = await fn();
      setNotice(msg || "");
      setDialog(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setDialog(null);
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    act(async () => {
      const d = await api<{ email: { sent: boolean; mode?: string; recipient?: string } }>(`/api/clinic/accounting/invoices/${id}/send`, { method: "POST" });
      if (!d.email.sent) return "Marked as sent. There's no email address on this invoice, so nothing was emailed.";
      if (d.email.mode === "test") return `Marked as sent. Email is in test mode, so the copy went to ${d.email.recipient} instead of ${invoice?.billToEmail}.`;
      return `Emailed to ${d.email.recipient}.`;
    });
  const pay = () =>
    act(async () => {
      await api(`/api/clinic/accounting/invoices/${id}/pay`, { method: "POST", json: { paidAt, paymentMethod: method } });
      return "Marked as paid and added to your income.";
    });
  const voidIt = () =>
    act(async () => {
      await api(`/api/clinic/accounting/invoices/${id}/void`, { method: "POST" });
      return "Invoice voided.";
    });
  const remove = async () => {
    setBusy(true);
    try {
      await api(`/api/clinic/accounting/invoices/${id}`, { method: "DELETE" });
      router.push("/clinic/accounting?tab=invoices");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete");
      setDialog(null);
      setBusy(false);
    }
  };

  if (!invoice) {
    return error ? <ErrorBanner message={error} /> : <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }

  const money = (c: number) => formatMoney(c, invoice.clinic.currency);
  const c = invoice.clinic;
  const clinicAddress = [c.address, [c.city, c.province].filter(Boolean).join(", ")].filter(Boolean);
  const overdue = invoice.status === "SENT" && invoice.dueDate && new Date(invoice.dueDate).getTime() < now;

  return (
    <div className="space-y-5">
      {/* Print: drop the app shell and page controls, keep only the invoice sheet. */}
      <style>{`@media print {
  header, aside, nav[aria-label="Breadcrumb"], .no-print { display: none !important; }
  main { position: static !important; padding: 0 !important; background: white !important; border-radius: 0 !important; overflow: visible !important; }
  main > div { padding: 0 !important; }
  .invoice-sheet { box-shadow: none !important; border: 0 !important; padding: 0 !important; }
  body { background: white !important; }
}`}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/clinic/accounting?tab=invoices" className="text-sm text-muted-foreground hover:text-foreground">
            ← Invoices
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="font-display text-heading-3 font-semibold text-foreground">{invoice.number}</h1>
            <InvoiceStatus status={invoice.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "DRAFT" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setDialog("delete")}>
                Delete
              </Button>
              <Link href={`/clinic/accounting/invoices/${id}/edit`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                Edit
              </Link>
            </>
          )}
          {(invoice.status === "SENT" || invoice.status === "PAID") && (
            <Button variant="ghost" size="sm" onClick={() => setDialog("void")}>
              Void
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>
          {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setDialog("send")}>
                {invoice.status === "SENT" ? "Resend" : "Send"}
              </Button>
              <Button variant="dark" size="sm" onClick={() => setDialog("pay")}>
                Mark paid
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="no-print space-y-3">
        <ErrorBanner message={error} />
        {notice && (
          <div role="status" className="rounded-xl border border-growth/30 bg-growth/10 px-4 py-3 text-sm font-semibold text-growth-ink">
            {notice}
          </div>
        )}
        {(invoice.sentAt || invoice.paidAt || overdue) && (
          <p className="text-sm text-muted-foreground">
            {invoice.sentAt && <>Sent {formatDay(invoice.sentAt)}. </>}
            {invoice.paidAt && (
              <>
                Paid {formatDay(invoice.paidAt)}
                {invoice.paymentMethod ? ` by ${invoice.paymentMethod}` : ""}.{" "}
              </>
            )}
            {overdue && <strong className="text-danger">Overdue since {formatDay(invoice.dueDate)}.</strong>}
          </p>
        )}
      </div>

      <article className="invoice-sheet admin-card mx-auto max-w-3xl p-6 sm:p-10">
        <div className="flex flex-col justify-between gap-6 sm:flex-row">
          <div>
            <p className="font-display text-xl font-semibold text-foreground">{c.name}</p>
            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              {clinicAddress.map((l) => (
                <p key={l}>{l}</p>
              ))}
              {c.phone && <p>{c.phone}</p>}
              {c.email && <p>{c.email}</p>}
              {c.website && <p>{c.website}</p>}
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{invoice.status === "VOID" ? "Void invoice" : "Invoice"}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-foreground">{invoice.number}</p>
            <dl className="mt-2 space-y-0.5 text-sm">
              <div className="flex gap-2 sm:justify-end">
                <dt className="text-muted-foreground">Issued</dt>
                <dd>{formatDay(invoice.issueDate)}</dd>
              </div>
              {invoice.dueDate && (
                <div className="flex gap-2 sm:justify-end">
                  <dt className="text-muted-foreground">Due</dt>
                  <dd>{formatDay(invoice.dueDate)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Billed to</p>
          <p className="mt-1 font-semibold text-foreground">{invoice.billToName}</p>
          {invoice.billToEmail && <p className="text-sm text-muted-foreground">{invoice.billToEmail}</p>}
          {invoice.patient?.phone && <p className="text-sm text-muted-foreground">{invoice.patient.phone}</p>}
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[460px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border-strong text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3">Description</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="py-2 pl-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l) => (
                <tr key={l.id} className="border-b border-border">
                  <td className="py-3 pr-3 text-foreground">
                    {l.description}
                    {l.taxable && <span className="ml-1.5 text-[11px] text-muted-foreground">({invoice.taxLabel})</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{l.quantity}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(l.unitPriceCents)}</td>
                  <td className="py-3 pl-3 text-right tabular-nums">{money(l.quantity * l.unitPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-6 w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{money(invoice.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {invoice.taxLabel} {formatRate(invoice.taxRateBps)}
            </dt>
            <dd className="tabular-nums">{money(invoice.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{money(invoice.totalCents)}</dd>
          </div>
          {invoice.status === "PAID" && (
            <div className="flex justify-between text-growth-ink">
              <dt>Paid {formatDay(invoice.paidAt)}</dt>
              <dd className="tabular-nums">{money(invoice.totalCents)}</dd>
            </div>
          )}
        </dl>

        {invoice.notes && <p className="mt-8 whitespace-pre-line border-t border-border pt-4 text-sm text-foreground-secondary">{invoice.notes}</p>}
      </article>

      {dialog === "send" && (
        <Modal title={invoice.status === "SENT" ? "Resend invoice" : "Send invoice"} onClose={() => setDialog(null)}>
          <p className="text-sm text-foreground-secondary">
            {invoice.billToEmail
              ? `${invoice.number} will be emailed to ${invoice.billToEmail}${invoice.status === "DRAFT" ? " and locked for editing" : ""}.`
              : `There's no email on this invoice. It will be marked as sent so you can print it or hand it over${invoice.status === "DRAFT" ? ", and locked for editing" : ""}.`}
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button onClick={send} loading={busy} disabled={busy}>
              {invoice.billToEmail ? "Send email" : "Mark as sent"}
            </Button>
          </div>
        </Modal>
      )}

      {dialog === "pay" && (
        <Modal title="Record payment" onClose={() => setDialog(null)}>
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              {money(invoice.totalCents)} from {invoice.billToName} will be added to your income under “Patient payments”.
            </p>
            <FormField id="paid-at" label="Payment date" required optionalLabel={false}>
              <Input id="paid-at" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
            </FormField>
            <FormField id="method" label="Payment method" required optionalLabel={false}>
              <Select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </FormField>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancel
              </Button>
              <Button onClick={pay} loading={busy} disabled={busy || !paidAt}>
                Mark paid
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {dialog === "void" && (
        <Modal title="Void invoice?" onClose={() => setDialog(null)}>
          <p className="text-sm text-foreground-secondary">
            {invoice.number} will be kept for your records but marked void.
            {invoice.ledgerEntry ? ` The ${money(invoice.totalCents)} payment recorded for it will be removed from your income.` : ""} This can&apos;t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={voidIt} loading={busy} disabled={busy}>
              Void invoice
            </Button>
          </div>
        </Modal>
      )}

      {dialog === "delete" && (
        <Modal title="Delete draft?" onClose={() => setDialog(null)}>
          <p className="text-sm text-foreground-secondary">The draft {invoice.number} will be deleted.</p>
          <div className="mt-5 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} loading={busy} disabled={busy}>
              Delete draft
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
