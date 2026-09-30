"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { IconGauge, IconReceipt } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { ErrorBanner, StatTile, TH, api, type MoneySettings } from "./shared";

type Summary = {
  clinic: MoneySettings;
  range: { from: string; to: string };
  entryCount: number;
  totals: { incomeCents: number; expenseCents: number; profitCents: number; taxCollectedCents: number; taxPaidCents: number };
  outstanding: { count: number; cents: number; overdueCount: number; overdueCents: number };
  expenseByCategory: { category: string; cents: number }[];
  incomeByCategory: { category: string; cents: number }[];
  months: { month: string; incomeCents: number; expenseCents: number; profitCents: number }[];
};

type Preset = "this-month" | "last-month" | "this-year" | "last-year" | "last-12" | "custom";

function ym(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function presetRange(p: Preset): { from: string; to: string } | null {
  const now = new Date();
  const y = now.getFullYear();
  switch (p) {
    case "this-month":
      return { from: ym(now), to: ym(now) };
    case "last-month": {
      const d = new Date(y, now.getMonth() - 1, 1);
      return { from: ym(d), to: ym(d) };
    }
    case "this-year":
      return { from: `${y}-01`, to: ym(now) };
    case "last-year":
      return { from: `${y - 1}-01`, to: `${y - 1}-12` };
    case "last-12":
      return { from: ym(new Date(y, now.getMonth() - 11, 1)), to: ym(now) };
    default:
      return null;
  }
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-CA", { month: "short", year: "numeric", timeZone: "UTC" });
}

export default function SummaryTab() {
  const [preset, setPreset] = useState<Preset>("this-month");
  const [custom, setCustom] = useState(() => presetRange("this-year")!);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const range = preset === "custom" ? custom : presetRange(preset)!;

  useEffect(() => {
    if (!range.from || !range.to) return;
    let cancelled = false;
    api<Summary>(`/api/clinic/accounting/summary?from=${range.from}&to=${range.to}`)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError("");
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to]);

  const money = (c: number) => formatMoney(c, data?.clinic.currency);
  const maxMonth = Math.max(1, ...(data?.months ?? []).flatMap((m) => [m.incomeCents, m.expenseCents]));
  const maxCategory = Math.max(1, ...(data?.expenseByCategory ?? []).map((c) => c.cents));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-52">
          <label htmlFor="period" className="mb-2 block text-field-label text-foreground">
            Period
          </label>
          <Select id="period" value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
            <option value="this-month">This month</option>
            <option value="last-month">Last month</option>
            <option value="this-year">This year</option>
            <option value="last-year">Last year</option>
            <option value="last-12">Last 12 months</option>
            <option value="custom">Custom months…</option>
          </Select>
        </div>
        {preset === "custom" && (
          <>
            <div className="w-[calc(50%-6px)] sm:w-44">
              <label htmlFor="from" className="mb-2 block text-field-label text-foreground">
                From
              </label>
              <Input id="from" type="month" value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
            </div>
            <div className="w-[calc(50%-6px)] sm:w-44">
              <label htmlFor="to" className="mb-2 block text-field-label text-foreground">
                To
              </label>
              <Input id="to" type="month" value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
            </div>
          </>
        )}
      </div>

      <ErrorBanner message={error} />

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Income" value={money(data.totals.incomeCents)} hint="Paid invoices and recorded income" />
            <StatTile label="Expenses" value={money(data.totals.expenseCents)} />
            <StatTile
              label="Profit"
              value={money(data.totals.profitCents)}
              tone={data.totals.profitCents < 0 ? "danger" : data.totals.profitCents > 0 ? "growth" : undefined}
            />
            <StatTile
              label="Outstanding"
              value={money(data.outstanding.cents)}
              hint={
                data.outstanding.count === 0
                  ? "No unpaid invoices"
                  : `${data.outstanding.count} unpaid${data.outstanding.overdueCount ? ` · ${data.outstanding.overdueCount} overdue (${money(data.outstanding.overdueCents)})` : ""}`
              }
              tone={data.outstanding.overdueCount ? "danger" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatTile label={`${data.clinic.taxLabel} collected`} value={money(data.totals.taxCollectedCents)} hint="Tax on income in this period" />
            <StatTile
              label={`${data.clinic.taxLabel} paid`}
              value={money(data.totals.taxPaidCents)}
              hint={`Net ${data.clinic.taxLabel} owing: ${money(data.totals.taxCollectedCents - data.totals.taxPaidCents)}`}
            />
          </div>

          {data.entryCount === 0 ? (
            <AdminCard title="Nothing recorded yet" icon={IconReceipt}>
              <EmptyState
                title="No income or expenses in this period"
                message="Paid invoices and the entries you add under Income & expenses show up here."
                compact={false}
              />
            </AdminCard>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <AdminCard title="Month by month" icon={IconGauge} flush>
                <div className="overflow-x-auto p-3">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className={`${TH} rounded-l-xl`}>Month</th>
                        <th className={`${TH} text-right`}>Income</th>
                        <th className={`${TH} text-right`}>Expenses</th>
                        <th className={`${TH} rounded-r-xl text-right`}>Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-xs">
                      {data.months.map((m) => (
                        <tr key={m.month}>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-foreground">{monthLabel(m.month)}</p>
                            <div className="mt-1.5 space-y-1" aria-hidden>
                              <span className="block h-1.5 rounded-full bg-growth" style={{ width: `${(m.incomeCents / maxMonth) * 100}%` }} />
                              <span className="block h-1.5 rounded-full bg-danger/70" style={{ width: `${(m.expenseCents / maxMonth) * 100}%` }} />
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(m.incomeCents)}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{money(m.expenseCents)}</td>
                          <td className={`px-3 py-3 text-right font-semibold tabular-nums ${m.profitCents < 0 ? "text-danger" : "text-foreground"}`}>
                            {money(m.profitCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 flex items-center gap-4 px-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-growth" /> Income
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-danger/70" /> Expenses
                    </span>
                  </p>
                </div>
              </AdminCard>

              <AdminCard title="Expenses by category" icon={IconReceipt}>
                {data.expenseByCategory.length === 0 ? (
                  <EmptyState title="No expenses in this period" message="" />
                ) : (
                  <ul className="space-y-3">
                    {data.expenseByCategory.map((c) => (
                      <li key={c.category}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="font-semibold text-foreground">{c.category}</span>
                          <span className="tabular-nums text-foreground">
                            {money(c.cents)}
                            <span className="ml-2 text-xs text-muted-foreground">{Math.round((c.cents / data.totals.expenseCents) * 100)}%</span>
                          </span>
                        </div>
                        <span className="mt-1.5 block h-2 rounded-full bg-surface-muted">
                          <span className="block h-2 rounded-full bg-primary" style={{ width: `${(c.cents / maxCategory) * 100}%` }} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {data.incomeByCategory.length > 0 && (
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Income by category</p>
                    <ul className="space-y-1.5 text-sm">
                      {data.incomeByCategory.map((c) => (
                        <li key={c.category} className="flex justify-between gap-3">
                          <span className="text-foreground">{c.category}</span>
                          <span className="tabular-nums">{money(c.cents)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AdminCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
