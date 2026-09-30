"use client";

import { useEffect, useRef } from "react";
import { IconClose } from "@/components/icons";

/** Right-hand slide-over for create/edit forms. Full width on phones. */
export function Drawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div ref={panelRef} className="animate-fade-in absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-surface shadow-xl">
        <div className="flex min-h-[68px] shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="mb-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm font-semibold text-danger">
      {message}
    </div>
  );
}

/** "2026-10-12T00:00:00.000Z" → "2026-10-12" for <input type="date">. */
export function toDateInput(iso: string | null | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

/** Date-only fields are stored at UTC midnight, so format them in UTC to avoid showing the previous day. */
export function formatDate(iso: string | null | undefined, opts: { dateOnly?: boolean } = { dateOnly: true }) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(opts.dateOnly ? { timeZone: "UTC" } : {}),
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-CA", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
