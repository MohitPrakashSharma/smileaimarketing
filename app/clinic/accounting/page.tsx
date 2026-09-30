"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SummaryTab from "@/components/clinic/accounting/SummaryTab";
import InvoicesTab from "@/components/clinic/accounting/InvoicesTab";
import LedgerTab from "@/components/clinic/accounting/LedgerTab";

const TABS = [
  { key: "summary", label: "Summary" },
  { key: "invoices", label: "Invoices" },
  { key: "ledger", label: "Income & expenses" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function Accounting() {
  const raw = useSearchParams().get("tab");
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "summary";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-heading-3 font-semibold text-foreground">Accounting</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invoices, income and expenses for your clinic.</p>
        </div>
      </div>

      <nav aria-label="Accounting sections" className="flex gap-1 overflow-x-auto rounded-full bg-surface p-1 shadow-xs sm:w-fit">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/clinic/accounting?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition-colors ${
              tab === t.key ? "bg-background-dark text-white" : "text-foreground-secondary hover:bg-surface-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "summary" && <SummaryTab />}
      {tab === "invoices" && <InvoicesTab />}
      {tab === "ledger" && <LedgerTab />}
    </div>
  );
}

export default function AccountingPage() {
  return (
    <Suspense>
      <Accounting />
    </Suspense>
  );
}
