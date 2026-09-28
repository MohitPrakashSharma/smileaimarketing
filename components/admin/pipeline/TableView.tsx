"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import type { ColumnKey, FieldKey, ViewConfig } from "@/lib/pipelineViews";
import { IconArrowUpRight, IconChevronDown, IconClipboardCheck } from "@/components/icons";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { groupLeads } from "@/components/admin/pipeline/fields";
import { PageSizeSelect } from "@/components/admin/pipeline/Toolbar";
import { COLUMN_LABELS, Pager } from "@/components/admin/pipeline/ui";
import {
  STAGES,
  formatAge,
  formatMoney,
  stageOf,
  ScorePill,
  StageDot,
  StageSelect,
  type MoveLead,
  type PipelineLead,
} from "@/components/admin/pipeline/shared";

export type BulkAction = "audit" | "outreach";

type Props = {
  leads: PipelineLead[];
  config: ViewConfig;
  onConfigChange: (patch: Partial<ViewConfig>) => void;
  onMove: MoveLead;
  onBulk: (action: BulkAction, ids: string[]) => Promise<void>;
  onExport: (leads: PipelineLead[]) => void;
};

// Column → the field it sorts by (contact has no single sortable value).
const SORT_FIELD: Partial<Record<ColumnKey | "name", FieldKey>> = {
  name: "name",
  stage: "stage",
  opportunityScore: "opportunityScore",
  auditScore: "auditScore",
  auditStatus: "auditStatus",
  outreachStatus: "outreachStatus",
  city: "city",
  province: "province",
  country: "country",
  dealValue: "dealValue",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

const RIGHT: ColumnKey[] = ["dealValue", "createdAt", "updatedAt"];
const CENTER: ColumnKey[] = ["opportunityScore", "auditScore"];

const lower = (s: string | null | undefined) => (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ") : "—");

function Cell({ col, lead, onMove }: { col: ColumnKey; lead: PipelineLead; onMove: MoveLead }) {
  switch (col) {
    case "stage":
      return (
        <span className="flex items-center gap-2">
          <StageDot stage={stageOf(lead.status)} />
          <StageSelect lead={lead} onMove={onMove} />
        </span>
      );
    case "opportunityScore":
      return <ScorePill score={lead.opportunityScore} />;
    case "auditScore":
      return lead.audit?.status === "COMPLETED" ? (
        <span className="font-semibold text-foreground">{lead.audit.score}</span>
      ) : (
        <span className="text-muted-foreground">{lead.audit ? lower(lead.audit.status) : "—"}</span>
      );
    case "auditStatus":
      return <span className="text-foreground">{lower(lead.audit?.status)}</span>;
    case "contact":
      return lead.contact ? (
        <>
          <p className="font-semibold text-foreground">{lead.contact.name}</p>
          <p className="text-[11px] text-muted-foreground">{lead.contact.email}</p>
        </>
      ) : (
        <span className="font-semibold text-warning">Missing</span>
      );
    case "outreachStatus":
      return <span className="text-foreground">{lead.outreachStatus ? lower(lead.outreachStatus) : "Not sent"}</span>;
    case "city":
      return <span className="text-foreground">{lead.city || "—"}</span>;
    case "province":
      return <span className="text-foreground">{lead.state || "—"}</span>;
    case "country":
      return <span className="text-foreground">{lead.country || "—"}</span>;
    case "dealValue":
      return lead.dealValueCents ? <span className="font-semibold text-foreground">{formatMoney(lead.dealValueCents)}</span> : <span className="text-muted-foreground">—</span>;
    case "createdAt":
      return <span className="text-muted-foreground">{new Date(lead.createdAt).toLocaleDateString("en-CA")}</span>;
    case "updatedAt":
      return <span className="text-muted-foreground">{formatAge(lead.updatedAt)}</span>;
  }
}

/** Config-driven table: chosen columns in chosen order, grouping, paging, bulk + quick actions. */
export function TableView({ leads, config, onConfigChange, onMove, onBulk, onExport }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStage, setBulkStage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const pages = Math.max(1, Math.ceil(leads.length / config.pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageRows = leads.slice(safePage * config.pageSize, (safePage + 1) * config.pageSize);
  const groups = config.groupBy ? groupLeads(pageRows, config.groupBy).filter((g) => g.leads.length > 0) : [{ key: "all", label: "", leads: pageRows }];

  // Selections the current filter still shows.
  const visibleSelected = leads.filter((l) => selected.has(l.id));
  const allOnPage = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const primarySort = config.sort[0];

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sortBy = (col: ColumnKey | "name") => {
    const field = SORT_FIELD[col];
    if (!field) return;
    const dir: "asc" | "desc" =
      primarySort?.field === field ? (primarySort.dir === "desc" ? "asc" : "desc") : field === "name" ? "asc" : "desc";
    onConfigChange({ sort: [{ field, dir }, ...config.sort.filter((s) => s.field !== field)].slice(0, 3) });
  };

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const header = (col: ColumnKey | "name", label: string, align: string) => {
    const field = SORT_FIELD[col];
    const sorted = field && primarySort?.field === field;
    return (
      <th key={col} scope="col" aria-sort={sorted ? (primarySort.dir === "asc" ? "ascending" : "descending") : "none"} className={`px-3 py-3 ${align}`}>
        {field ? (
          <button onClick={() => sortBy(col)} className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider hover:text-foreground ${sorted ? "text-foreground" : ""}`}>
            {label}
            <IconChevronDown className={`h-3.5 w-3.5 ${sorted ? "" : "opacity-0"} ${sorted && primarySort.dir === "asc" ? "rotate-180" : ""}`} />
          </button>
        ) : (
          <span className="font-semibold uppercase tracking-wider">{label}</span>
        )}
      </th>
    );
  };

  const colCount = config.columns.length + 3;

  return (
    <div className="admin-card overflow-hidden">
      {visibleSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent-soft px-4 py-2.5">
          <span className="text-xs font-semibold text-primary-ink">{visibleSelected.length} selected</span>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
            aria-label="Move selected leads to stage"
            className="h-8 rounded-full border border-border bg-surface pl-3 pr-7 text-xs font-semibold text-foreground"
          >
            <option value="">Move to stage…</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            disabled={!bulkStage || busy !== null}
            onClick={() =>
              void run("move", async () => {
                for (const l of visibleSelected) if (l.status !== bulkStage) await onMove(l.id, bulkStage);
                setBulkStage("");
                setSelected(new Set());
              })
            }
            className="inline-flex h-8 items-center rounded-full bg-background-dark px-4 text-xs font-semibold text-white hover:bg-primary disabled:opacity-50"
          >
            {busy === "move" ? "Moving…" : "Apply"}
          </button>
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <button
            disabled={busy !== null}
            onClick={() => void run("audit", () => onBulk("audit", visibleSelected.map((l) => l.id)))}
            className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            {busy === "audit" ? "Queuing…" : "Run audit"}
          </button>
          <button
            disabled={busy !== null}
            onClick={() => void run("outreach", () => onBulk("outreach", visibleSelected.map((l) => l.id)))}
            className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
          >
            {busy === "outreach" ? "Sending…" : "Send outreach"}
          </button>
          <button
            onClick={() => onExport(visibleSelected)}
            className="inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
          >
            Export CSV
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground">
            Clear selection
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[11px] text-muted-foreground">
              <th scope="col" className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all leads on this page"
                  checked={allOnPage}
                  onChange={() =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      for (const r of pageRows) {
                        if (allOnPage) next.delete(r.id);
                        else next.add(r.id);
                      }
                      return next;
                    })
                  }
                />
              </th>
              {header("name", "Practice", "text-left")}
              {config.columns.map((c) => header(c, COLUMN_LABELS[c], RIGHT.includes(c) ? "text-right" : CENTER.includes(c) ? "text-center" : "text-left"))}
              <th scope="col" className="w-24 px-3 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No leads match this view.
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <Fragment key={g.key}>
                {config.groupBy && (
                  <tr className="border-t border-border bg-surface-muted/60">
                    <td colSpan={colCount} className="px-4 py-2">
                      <button
                        onClick={() =>
                          setCollapsed((prev) => {
                            const next = new Set(prev);
                            if (next.has(g.key)) next.delete(g.key);
                            else next.add(g.key);
                            return next;
                          })
                        }
                        aria-expanded={!collapsed.has(g.key)}
                        className="flex items-center gap-2 text-xs font-semibold text-foreground"
                      >
                        <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed.has(g.key) ? "-rotate-90" : ""}`} />
                        {g.dot && <span aria-hidden className={`h-2 w-2 rounded-full ${g.dot}`} />}
                        {g.label}
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">{g.leads.length}</span>
                      </button>
                    </td>
                  </tr>
                )}
                {!collapsed.has(g.key) &&
                  g.leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`group border-t border-border transition-colors hover:bg-surface-muted/50 ${selected.has(lead.id) ? "bg-accent-soft/50" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <input type="checkbox" aria-label={`Select ${lead.name}`} checked={selected.has(lead.id)} onChange={() => toggleRow(lead.id)} />
                      </td>
                      <td className="px-3 py-3">
                        <Link href={`/admin/businesses/${lead.id}`} className="font-semibold text-foreground hover:text-primary-ink hover:underline">
                          {lead.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{[lead.city, lead.state].filter(Boolean).join(", ")}</p>
                      </td>
                      {config.columns.map((c) => (
                        <td key={c} className={`px-3 py-3 ${RIGHT.includes(c) ? "text-right" : CENTER.includes(c) ? "text-center" : ""}`}>
                          <Cell col={c} lead={lead} onMove={onMove} />
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Link
                            href={`/admin/businesses/${lead.id}`}
                            aria-label={`Open ${lead.name}`}
                            title="Open lead"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted"
                          >
                            <IconArrowUpRight className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => void run(`audit-${lead.id}`, () => onBulk("audit", [lead.id]))}
                            disabled={busy !== null}
                            aria-label={`Run audit for ${lead.name}`}
                            title="Run audit"
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted disabled:opacity-50"
                          >
                            <IconClipboardCheck className="h-4 w-4" />
                          </button>
                          <ActionMenu
                            ariaLabel={`More actions for ${lead.name}`}
                            items={[
                              { label: "Send outreach", onClick: () => void run(`out-${lead.id}`, () => onBulk("outreach", [lead.id])) },
                              { label: "Mark won", variant: "success", onClick: () => void onMove(lead.id, "CONVERTED") },
                              { label: "Mark disqualified", variant: "danger", onClick: () => void onMove(lead.id, "DISQUALIFIED") },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border">
        <Pager page={safePage} pageSize={config.pageSize} total={leads.length} onPage={setPage}>
          <PageSizeSelect config={config} onChange={onConfigChange} />
        </Pager>
      </div>
    </div>
  );
}
