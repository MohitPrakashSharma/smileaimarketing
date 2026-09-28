"use client";

import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { IconGauge, IconClock } from "@/components/icons";
import {
  STAGES,
  STALE_DAYS,
  daysSince,
  formatMoney,
  stageOf,
  StageDot,
  type PipelineLead,
} from "@/components/admin/pipeline/shared";

// Stages in funnel order; Disqualified sits outside the funnel.
const FUNNEL = STAGES.filter((s) => s.value !== "DISQUALIFIED");
const FUNNEL_INDEX = new Map<string, number>(FUNNEL.map((s, i) => [s.value, i]));

/** Stage-by-stage conversion and value, plus leads that have gone quiet. */
export function SummaryView({ leads }: { leads: PipelineLead[] }) {
  // "Reached" = currently at this stage or any later funnel stage.
  const reached = FUNNEL.map((stage, i) =>
    leads.filter((l) => {
      const idx = FUNNEL_INDEX.get(l.status);
      return idx !== undefined && idx >= i;
    }).length
  );
  const top = Math.max(reached[0], 1);
  const disqualified = leads.filter((l) => l.status === "DISQUALIFIED").length;
  const openLeads = leads.filter((l) => l.status !== "CONVERTED" && l.status !== "DISQUALIFIED");
  const won = leads.filter((l) => l.status === "CONVERTED");
  const wonValue = won.reduce((s, l) => s + (l.dealValueCents ?? 0), 0);
  const openValue = openLeads.reduce((s, l) => s + (l.dealValueCents ?? 0), 0);
  const stalled = openLeads
    .filter((l) => daysSince(l.updatedAt) >= STALE_DAYS)
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  const tiles = [
    { label: "Open leads", value: String(openLeads.length) },
    { label: "Open pipeline value", value: formatMoney(openValue) },
    { label: "Won", value: `${won.length} · ${formatMoney(wonValue)}` },
    { label: "Win rate", value: leads.length ? `${Math.round((won.length / leads.length) * 100)}%` : "—" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="admin-card p-5">
            <p className="text-xs font-semibold text-muted-foreground">{t.label}</p>
            <p className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <AdminCard title="Stage Conversion" icon={IconGauge} subtitle="How many leads reached each stage, and how many carried on">
          <ol className="space-y-4">
            {FUNNEL.map((stage, i) => {
              const count = reached[i];
              const inStage = leads.filter((l) => l.status === stage.value).length;
              const conv = i > 0 && reached[i - 1] > 0 ? Math.round((count / reached[i - 1]) * 100) : null;
              return (
                <li key={stage.value}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 font-semibold text-foreground">
                      <StageDot stage={stage} />
                      {stage.label}
                      <span className="font-normal text-muted-foreground">· {inStage} here now</span>
                    </span>
                    <span className="flex items-baseline gap-2">
                      {conv !== null && <span className="text-[11px] text-muted-foreground">{conv}% from prev.</span>}
                      <span className="font-display text-base font-bold text-foreground">{count}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`h-full rounded-full ${stage.dot}`} style={{ width: `${count ? Math.max((count / top) * 100, 3) : 0}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            {disqualified} lead{disqualified === 1 ? "" : "s"} disqualified and excluded from the funnel.
          </p>
        </AdminCard>

        <AdminCard title="Stalled Leads" icon={IconClock} count={stalled.length} subtitle={`No update in ${STALE_DAYS}+ days`} flush>
          {stalled.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">Nothing stalled — every open lead moved in the last {STALE_DAYS} days.</p>
          ) : (
            <ul className="divide-y divide-border">
              {stalled.slice(0, 8).map((lead) => {
                const stage = stageOf(lead.status);
                return (
                  <li key={lead.id} className="flex items-center gap-3 px-5 py-3">
                    <StageDot stage={stage} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/businesses/${lead.id}`} className="block truncate text-sm font-semibold text-foreground hover:text-primary-ink">
                        {lead.name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{stage.label}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-warning">{daysSince(lead.updatedAt)}d</span>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
