"use client";

import { useState } from "react";
import Link from "next/link";
import type { ViewConfig } from "@/lib/pipelineViews";
import { IconChevronDown } from "@/components/icons";
import { groupLeads } from "@/components/admin/pipeline/fields";
import { PageSizeSelect } from "@/components/admin/pipeline/Toolbar";
import { Pager } from "@/components/admin/pipeline/ui";
import { formatAge, formatMoney, nextAction, ScorePill, StageSelect, type MoveLead, type PipelineLead } from "@/components/admin/pipeline/shared";

/** Leads grouped (by the view's grouping, stage by default) in collapsible sections. */
export function ListView({
  leads,
  config,
  onConfigChange,
  onMove,
}: {
  leads: PipelineLead[];
  config: ViewConfig;
  onConfigChange: (patch: Partial<ViewConfig>) => void;
  onMove: MoveLead;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const pages = Math.max(1, Math.ceil(leads.length / config.pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageRows = leads.slice(safePage * config.pageSize, (safePage + 1) * config.pageSize);
  const groups = groupLeads(pageRows, config.groupBy ?? "stage");

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-3">
      {groups.map((g) => {
        const value = g.leads.reduce((s, l) => s + (l.dealValueCents ?? 0), 0);
        // Empty groups start collapsed so populated ones lead.
        const isOpen = g.leads.length > 0 && !collapsed.has(g.key);
        return (
          <section key={g.key} className="admin-card overflow-hidden">
            <button
              onClick={() => toggle(g.key)}
              aria-expanded={isOpen}
              disabled={g.leads.length === 0}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
            >
              <IconChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              {g.dot && <span aria-hidden className={`h-2 w-2 rounded-full ${g.dot}`} />}
              <span className={`text-sm font-semibold ${g.leads.length ? "text-foreground" : "text-muted-foreground"}`}>{g.label}</span>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{g.leads.length}</span>
              {value > 0 && <span className="ml-auto text-xs font-semibold text-foreground">{formatMoney(value)}</span>}
            </button>

            {isOpen && (
              <ul className="divide-y divide-border border-t border-border">
                {g.leads.map((lead) => (
                  <li key={lead.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-xs font-bold text-foreground">
                      {lead.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/admin/businesses/${lead.id}`} className="block truncate text-sm font-semibold text-foreground hover:text-primary-ink">
                        {lead.name}
                      </Link>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {lead.city} · {lead.contact ? lead.contact.name : "no contact"} · updated {formatAge(lead.updatedAt)}
                      </p>
                    </div>
                    <ScorePill score={lead.opportunityScore} />
                    <span className="hidden w-32 text-[11px] font-semibold text-primary-ink md:block">{nextAction(lead.status)}</span>
                    <StageSelect lead={lead} onMove={onMove} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {leads.length === 0 && <p className="admin-card px-5 py-10 text-center text-sm text-muted-foreground">No leads match this view.</p>}

      {leads.length > config.pageSize && (
        <div className="admin-card">
          <Pager page={safePage} pageSize={config.pageSize} total={leads.length} onPage={setPage}>
            <PageSizeSelect config={config} onChange={onConfigChange} />
          </Pager>
        </div>
      )}
    </div>
  );
}
