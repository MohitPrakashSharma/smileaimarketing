"use client";

import { useState } from "react";
import Link from "next/link";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { IconChevronRight, IconUser, IconClock } from "@/components/icons";
import {
  STAGES,
  STALE_DAYS,
  daysSince,
  formatAge,
  formatMoney,
  nextAction,
  ScorePill,
  StageDot,
  type MoveLead,
  type PipelineLead,
} from "@/components/admin/pipeline/shared";

/** Kanban board: one column per stage, cards drag between columns to change stage. */
export function BoardView({ leads, onMove }: { leads: PipelineLead[]; onMove: MoveLead }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (value: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-3">
      <div className="flex min-w-max items-start gap-4">
        {STAGES.map((stage) => {
          const list = leads.filter((l) => l.status === stage.value);
          const value = list.reduce((s, l) => s + (l.dealValueCents ?? 0), 0);
          const avg = list.length ? Math.round(list.reduce((s, l) => s + l.opportunityScore, 0) / list.length) : 0;
          const isOver = overStage === stage.value && dragId !== null;

          if (collapsed.has(stage.value)) {
            return (
              <button
                key={stage.value}
                onClick={() => toggle(stage.value)}
                aria-label={`Expand ${stage.label}`}
                className="admin-card flex h-[60vh] w-14 shrink-0 flex-col items-center gap-3 py-4 hover:border-border-strong"
              >
                <StageDot stage={stage} />
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{list.length}</span>
                <span className="text-xs font-semibold text-foreground [writing-mode:vertical-rl]">{stage.label}</span>
              </button>
            );
          }

          return (
            <section
              key={stage.value}
              aria-label={stage.label}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overStage !== stage.value) setOverStage(stage.value);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                setOverStage(null);
                setDragId(null);
                const lead = leads.find((l) => l.id === id);
                if (lead && lead.status !== stage.value) void onMove(id, stage.value);
              }}
              className={`admin-card flex w-[280px] shrink-0 flex-col transition-colors ${isOver ? "border-primary bg-accent-soft/40" : ""}`}
            >
              <header className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <StageDot stage={stage} />
                    <h3 className="truncate text-sm font-semibold text-foreground">{stage.label}</h3>
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{list.length}</span>
                  </div>
                  <button
                    onClick={() => toggle(stage.value)}
                    aria-label={`Collapse ${stage.label}`}
                    title="Collapse"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  >
                    <IconChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {value > 0 ? <span className="font-semibold text-foreground">{formatMoney(value)}</span> : "No deal value"}
                  {list.length > 0 && <span> · avg score {avg}</span>}
                </p>
              </header>

              <div className="max-h-[62vh] min-h-[120px] space-y-2.5 overflow-y-auto p-3">
                {list.length === 0 ? (
                  <p
                    className={`flex h-24 items-center justify-center rounded-2xl border border-dashed text-[11px] ${
                      isOver ? "border-primary text-primary-ink" : "border-border text-muted-foreground"
                    }`}
                  >
                    {isOver ? "Drop to move here" : "No leads"}
                  </p>
                ) : (
                  list.map((lead) => (
                    <BoardCard
                      key={lead.id}
                      lead={lead}
                      dragging={dragId === lead.id}
                      onDragStart={() => setDragId(lead.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverStage(null);
                      }}
                      onMove={onMove}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BoardCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
}: {
  lead: PipelineLead;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: MoveLead;
}) {
  const stale = daysSince(lead.updatedAt) >= STALE_DAYS && lead.status !== "CONVERTED" && lead.status !== "DISQUALIFIED";

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`group cursor-grab rounded-2xl border border-border bg-surface p-3.5 transition-shadow hover:border-border-strong hover:shadow-md active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/admin/businesses/${lead.id}`} className="block truncate text-sm font-semibold text-foreground hover:text-primary-ink">
            {lead.name}
          </Link>
          <p className="truncate text-[11px] text-muted-foreground">{lead.city || "Location pending"}</p>
        </div>
        <ActionMenu
          ariaLabel={`Actions for ${lead.name}`}
          items={[
            { label: "View details", onClick: () => (window.location.href = `/admin/businesses/${lead.id}`) },
            ...STAGES.filter((s) => s.value !== lead.status).map((s) => ({
              label: `Move to ${s.label}`,
              variant: s.value === "CONVERTED" ? ("success" as const) : s.value === "DISQUALIFIED" ? ("danger" as const) : ("default" as const),
              onClick: () => void onMove(lead.id, s.value),
            })),
          ]}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <ScorePill score={lead.opportunityScore} />
        {lead.dealValueCents ? (
          <span className="rounded-full bg-growth-soft px-2 py-0.5 text-[11px] font-semibold text-growth-ink">{formatMoney(lead.dealValueCents)}</span>
        ) : null}
        {lead.audit?.status === "COMPLETED" && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">Audit {lead.audit.score}</span>
        )}
      </div>

      <div className="mt-3 space-y-1 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
        <p className="flex items-center gap-1.5 truncate">
          <IconUser className="h-3.5 w-3.5 shrink-0" />
          {lead.contact ? lead.contact.name : <span className="text-warning">No contact yet</span>}
        </p>
        <p className={`flex items-center gap-1.5 ${stale ? "font-semibold text-warning" : ""}`}>
          <IconClock className="h-3.5 w-3.5 shrink-0" />
          Updated {formatAge(lead.updatedAt)}
          {stale && " · stalled"}
        </p>
      </div>

      <p className="mt-2.5 text-[11px] font-semibold text-primary-ink">Next: {nextAction(lead.status)}</p>
    </article>
  );
}
