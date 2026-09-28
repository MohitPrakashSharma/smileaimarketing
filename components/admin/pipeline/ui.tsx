"use client";

import { useEffect, useRef, useState } from "react";
import type { ColumnKey } from "@/lib/pipelineViews";

export const COLUMN_LABELS: Record<ColumnKey, string> = {
  stage: "Stage",
  opportunityScore: "Score",
  auditScore: "Audit",
  auditStatus: "Audit status",
  contact: "Contact",
  outreachStatus: "Outreach",
  city: "City",
  province: "Province",
  country: "Country",
  dealValue: "Deal value",
  createdAt: "Added",
  updatedAt: "Last activity",
};

export const toolbarButton =
  "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

export const fieldControl =
  "h-9 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Button that opens an anchored panel; closes on outside click or Escape. */
export function Popover({
  label,
  icon,
  badge,
  active = false,
  align = "left",
  width = "w-80",
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  active?: boolean;
  align?: "left" | "right";
  width?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`${toolbarButton} ${active || open ? "border-primary/40 bg-accent-soft text-primary-ink" : ""}`}
      >
        {icon}
        {label}
        {badge ? <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold leading-5 text-white">{badge}</span> : null}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={`animate-fade-in-down absolute top-12 z-40 ${width} max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-surface p-4 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Centered modal used for create / rename / delete confirmations. */
export function Dialog({
  title,
  onClose,
  children,
  width = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`admin-card max-h-[90vh] w-full overflow-y-auto p-6 shadow-xl ${width}`}
      >
        <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export const primaryButton =
  "inline-flex h-10 items-center rounded-full bg-background-dark px-5 text-sm font-semibold text-white transition-colors hover:bg-primary disabled:opacity-50";
export const secondaryButton =
  "inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted";

/** "1–25 of 80" with previous/next; the page-size select sits beside it. */
export function Pager({
  page,
  pageSize,
  total,
  onPage,
  children,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  children?: React.ReactNode;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const btn = "inline-flex h-9 items-center rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:bg-surface-muted disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-2">
        {children}
        <button className={btn} disabled={page === 0} onClick={() => onPage(page - 1)}>
          Previous
        </button>
        <span>
          Page {page + 1} of {pages}
        </span>
        <button className={btn} disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
