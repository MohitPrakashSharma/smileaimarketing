"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import InvoiceForm, { type InvoiceFormInitial } from "@/components/clinic/accounting/InvoiceForm";
import { api } from "@/components/clinic/accounting/shared";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<InvoiceFormInitial | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ invoice: InvoiceFormInitial & { status: string } }>(`/api/clinic/accounting/invoices/${id}`)
      .then(({ invoice }) => {
        if (invoice.status !== "DRAFT") setError("Only draft invoices can be edited.");
        else setInitial(invoice);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="font-semibold text-foreground">{error}</p>
        <Link href={`/clinic/accounting/invoices/${id}`} className="mt-3 inline-block text-sm font-semibold text-primary-ink hover:underline">
          Back to the invoice
        </Link>
      </div>
    );
  }
  if (!initial) return <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  return <InvoiceForm initial={initial} />;
}
