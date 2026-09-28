"use client";

import { useEffect, useRef, useState } from "react";
import type { PipelineViewDTO } from "@/lib/pipelineViews";
import { IconMenuDots, IconPlus, IconStar, IconUsers, IconChevronDown, IconSearch, IconTrash } from "@/components/icons";
import { Dialog, Popover, primaryButton, secondaryButton } from "@/components/admin/pipeline/ui";

export type ViewAction = "rename" | "duplicate" | "delete" | "default" | "share";

type Props = {
  views: PipelineViewDTO[];
  activeId: string | null;
  defaultId: string | null;
  dirty: boolean;
  saving: boolean;
  onSelect: (id: string) => void;
  onCreate: (name: string, shared: boolean, fromCurrent: boolean) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onAction: (id: string, action: Exclude<ViewAction, "rename">) => Promise<void>;
  onSave: () => void;
  onReset: () => void;
};

/** Saved-view tabs with per-view menu, "+ Create view", and unsaved-change controls. */
export function ViewTabs({ views, activeId, defaultId, dirty, saving, onSelect, onCreate, onRename, onAction, onSave, onReset }: Props) {
  const [dialog, setDialog] = useState<{ kind: "create" } | { kind: "rename" | "delete"; view: PipelineViewDTO } | null>(null);
  const active = views.find((v) => v.id === activeId);

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <div className="-mb-3 flex min-w-0 flex-1 items-end gap-1 overflow-x-auto" role="tablist" aria-label="Saved views">
        {views.map((v) => {
          const on = v.id === activeId;
          return (
            <div
              key={v.id}
              className={`group flex shrink-0 items-center gap-1 rounded-t-2xl border-b-2 px-3 pb-2.5 pt-2 transition-colors ${
                on ? "border-background-dark" : "border-transparent hover:border-border-strong"
              }`}
            >
              <button
                role="tab"
                aria-selected={on}
                onClick={() => onSelect(v.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold ${on ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {v.id === defaultId && (
                  <>
                    <IconStar className="h-3.5 w-3.5 text-warning" />
                    <span className="sr-only">Default view:</span>
                  </>
                )}
                {v.shared && (
                  <>
                    <IconUsers className="h-3.5 w-3.5" />
                    <span className="sr-only">Shared view:</span>
                  </>
                )}
                {v.name}
                {on && dirty && (
                  <>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
                    <span className="sr-only">(unsaved changes)</span>
                  </>
                )}
              </button>
              <ViewMenu
                view={v}
                isDefault={v.id === defaultId}
                visible={on}
                onPick={(action) => {
                  if (action === "rename" || action === "delete") setDialog({ kind: action, view: v });
                  else void onAction(v.id, action);
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <AllViews views={views} activeId={activeId} onSelect={onSelect} onDelete={(view) => setDialog({ kind: "delete", view })} />
        <button
          onClick={() => setDialog({ kind: "create" })}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border-strong px-3 text-xs font-semibold text-foreground hover:bg-surface-muted"
        >
          <IconPlus className="h-3.5 w-3.5" /> Create view
        </button>
      </div>

      {dirty && (
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
          <button onClick={onReset} className="inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold text-muted-foreground hover:bg-surface-muted hover:text-foreground">
            Reset
          </button>
          <button onClick={onSave} disabled={saving} className="inline-flex h-9 items-center rounded-full bg-background-dark px-4 text-xs font-semibold text-white hover:bg-primary disabled:opacity-50">
            {saving ? "Saving…" : active?.editable ? "Save view" : "Save as new view"}
          </button>
        </div>
      )}

      {dialog?.kind === "create" && (
        <NameDialog
          title="Create view"
          initial=""
          showCreateOptions
          onClose={() => setDialog(null)}
          onSubmit={async (name, shared, fromCurrent) => {
            await onCreate(name, shared, fromCurrent);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "rename" && (
        <NameDialog
          title="Rename view"
          initial={dialog.view.name}
          onClose={() => setDialog(null)}
          onSubmit={async (name) => {
            await onRename(dialog.view.id, name);
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "delete" && (
        <Dialog title="Delete view?" onClose={() => setDialog(null)}>
          <p className="mt-2 text-sm text-muted-foreground">
            &ldquo;{dialog.view.name}&rdquo; will be removed{dialog.view.shared ? " for everyone it's shared with" : ""}. Leads aren&apos;t affected.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={() => setDialog(null)} className={secondaryButton}>
              Cancel
            </button>
            <button
              onClick={async () => {
                await onAction(dialog.view.id, "delete");
                setDialog(null);
              }}
              className="inline-flex h-10 items-center rounded-full bg-danger px-5 text-sm font-semibold text-white hover:opacity-90"
            >
              Delete view
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function ViewMenu({ view, isDefault, visible, onPick }: { view: PipelineViewDTO; isDefault: boolean; visible: boolean; onPick: (a: ViewAction) => void }) {
  // Anchored with `fixed` coordinates: the tab strip scrolls horizontally, which would clip an absolute menu.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const open = pos !== null;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setPos(null);
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  const items: { action: ViewAction; label: string; danger?: boolean }[] = [
    ...(view.editable ? [{ action: "rename" as const, label: "Rename" }] : []),
    { action: "duplicate", label: "Duplicate" },
    ...(isDefault ? [] : [{ action: "default" as const, label: "Set as default" }]),
    ...(view.editable ? [{ action: "share" as const, label: view.shared ? "Make private" : "Share with team" }] : []),
    ...(view.editable ? [{ action: "delete" as const, label: "Delete", danger: true }] : []),
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          if (open) return setPos(null);
          const r = e.currentTarget.getBoundingClientRect();
          setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 200) });
        }}
        aria-label={`Options for ${view.name}`}
        aria-expanded={open}
        className={`flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground focus:opacity-100 ${
          visible || open ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <IconMenuDots className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          style={{ top: pos.top, left: pos.left }}
          className="animate-fade-in-down fixed z-50 w-48 rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {!view.editable && <p className="px-3 py-1.5 text-[11px] text-muted-foreground">Shared by {view.ownerName}</p>}
          {items.map((it) => (
            <button
              key={it.action}
              onClick={() => {
                setPos(null);
                onPick(it.action);
              }}
              className={`flex min-h-9 w-full items-center rounded-xl px-3 text-left text-xs font-semibold ${
                it.danger ? "text-danger hover:bg-danger/10" : "text-foreground hover:bg-surface-muted"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AllViews({
  views,
  activeId,
  onSelect,
  onDelete,
}: {
  views: PipelineViewDTO[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (view: PipelineViewDTO) => void;
}) {
  const [q, setQ] = useState("");
  const list = views.filter((v) => v.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Popover label="All views" icon={<IconChevronDown className="h-4 w-4" />} align="right" width="w-72">
      {(close) => (
        <div>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a view…"
              aria-label="Find a view"
              className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <ul className="mt-2 max-h-72 space-y-0.5 overflow-y-auto">
            {list.map((v) => (
              <li key={v.id} className="group/row flex items-center gap-1 rounded-xl hover:bg-surface-muted">
                <button
                  onClick={() => {
                    onSelect(v.id);
                    close();
                  }}
                  className={`flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                    v.id === activeId ? "font-semibold text-primary-ink" : "text-foreground"
                  }`}
                >
                  <span className="truncate">{v.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{v.editable ? (v.shared ? "Shared" : "Private") : v.ownerName}</span>
                </button>
                {v.editable ? (
                  <button
                    onClick={() => {
                      close();
                      onDelete(v);
                    }}
                    aria-label={`Delete ${v.name}`}
                    title="Delete view"
                    className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-60 hover:bg-danger/10 hover:text-danger hover:opacity-100 focus:opacity-100 group-hover/row:opacity-100"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <span aria-hidden className="mr-1 h-7 w-7 shrink-0" />
                )}
              </li>
            ))}
            {list.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No views match.</li>}
          </ul>
        </div>
      )}
    </Popover>
  );
}

function NameDialog({
  title,
  initial,
  showCreateOptions = false,
  onClose,
  onSubmit,
}: {
  title: string;
  initial: string;
  showCreateOptions?: boolean;
  onClose: () => void;
  onSubmit: (name: string, shared: boolean, fromCurrent: boolean) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [shared, setShared] = useState(false);
  const [fromCurrent, setFromCurrent] = useState(true);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          try {
            await onSubmit(name.trim(), shared, fromCurrent);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label htmlFor="view-name" className="mt-5 block text-xs font-semibold text-foreground">
          View name
        </label>
        <input
          id="view-name"
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Toronto follow-ups"
          className="mt-1.5 h-11 w-full rounded-full border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {showCreateOptions && (
          <fieldset className="mt-4 space-y-2 text-sm text-foreground">
            <legend className="text-xs font-semibold">Start from</legend>
            <label className="flex items-center gap-2">
              <input type="radio" checked={fromCurrent} onChange={() => setFromCurrent(true)} /> Current filters, sort and columns
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={!fromCurrent} onChange={() => setFromCurrent(false)} /> A blank view (all leads)
            </label>
            <label className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Share with the team
            </label>
          </fieldset>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={secondaryButton}>
            Cancel
          </button>
          <button type="submit" disabled={!name.trim() || busy} className={primaryButton}>
            {busy ? "Saving…" : showCreateOptions ? "Create view" : "Rename"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
