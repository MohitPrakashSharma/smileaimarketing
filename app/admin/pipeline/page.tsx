"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IconGrid, IconLayout, IconFileText, IconGauge } from "@/components/icons";
import { EmptyState } from "@/components/admin/EmptyState";
import { BoardView } from "@/components/admin/pipeline/BoardView";
import { TableView, type BulkAction } from "@/components/admin/pipeline/TableView";
import { ListView } from "@/components/admin/pipeline/ListView";
import { SummaryView } from "@/components/admin/pipeline/SummaryView";
import { Toolbar, FilterChips } from "@/components/admin/pipeline/Toolbar";
import { ViewTabs } from "@/components/admin/pipeline/ViewTabs";
import { COLUMN_LABELS, toolbarButton } from "@/components/admin/pipeline/ui";
import { applyView } from "@/components/admin/pipeline/fields";
import { formatMoney, stageOf, type PipelineLead } from "@/components/admin/pipeline/shared";
import { DEFAULT_CONFIG, VIEW_TYPES, parseViewConfig, type PipelineViewDTO, type ViewConfig, type ViewType } from "@/lib/pipelineViews";

const TYPE_TABS: { key: ViewType; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { key: "board", label: "Board", Icon: IconGrid },
  { key: "table", label: "Table", Icon: IconLayout },
  { key: "list", label: "List", Icon: IconFileText },
  { key: "summary", label: "Summary", Icon: IconGauge },
];

// Unsaved edits per view survive reloads; the last active view is reopened.
const DRAFTS_KEY = "admin.pipeline.drafts";
const ACTIVE_KEY = "admin.pipeline.activeView";
// Used only if saved views can't be loaded, so the pipeline still works.
const LOCAL_VIEW = "__local";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be blocked; drafts then just last for this visit.
  }
}

const same = (a: ViewConfig, b: ViewConfig) => JSON.stringify(a) === JSON.stringify(b);

function csvCell(v: string | number | null | undefined) {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AdminPipelinePage() {
  return (
    <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />}>
      <Pipeline />
    </Suspense>
  );
}

function Pipeline() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [leadsLoaded, setLeadsLoaded] = useState(false);
  const [views, setViews] = useState<PipelineViewDTO[]>([]);
  const [viewsLoaded, setViewsLoaded] = useState(false);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, ViewConfig>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [wonTarget, setWonTarget] = useState<PipelineLead | null>(null);

  const notify = (tone: "ok" | "error", text: string) => setMessage({ tone, text });

  // ---- data ---------------------------------------------------------------

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/businesses");
      const data = await res.json();
      if (res.ok) setLeads(data.businesses || []);
    } catch (err) {
      console.error("Error fetching pipeline:", err);
    } finally {
      setLeadsLoaded(true);
    }
  }, [setLeads, setLeadsLoaded]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchLeads();
      void (async () => {
        const storedDrafts = readStorage<Record<string, unknown>>(DRAFTS_KEY, {});
        const cleanDrafts: Record<string, ViewConfig> = {};
        for (const [id, cfg] of Object.entries(storedDrafts)) {
          const parsed = parseViewConfig(cfg);
          if (parsed) cleanDrafts[id] = parsed;
        }
        let list: PipelineViewDTO[] = [];
        let def: string | null = null;
        try {
          const res = await fetch("/api/admin/pipeline-views");
          const data = await res.json();
          if (res.ok) {
            list = data.views;
            def = data.defaultViewId;
          }
        } catch (err) {
          console.error("Error loading saved views:", err);
        }
        const urlId = new URLSearchParams(window.location.search).get("v");
        const lastId = readStorage<string | null>(ACTIVE_KEY, null);
        const pick = [urlId, lastId, def, list[0]?.id].find((id) => id && list.some((v) => v.id === id)) ?? (list.length ? list[0].id : LOCAL_VIEW);

        // A ?view=table link (older bookmarks) switches the type of whatever view opens.
        const urlType = new URLSearchParams(window.location.search).get("view");
        if (urlType && (VIEW_TYPES as readonly string[]).includes(urlType)) {
          const base = cleanDrafts[pick] ?? list.find((v) => v.id === pick)?.config ?? DEFAULT_CONFIG;
          if (base.type !== urlType) cleanDrafts[pick] = { ...base, type: urlType as ViewType };
        }

        setViews(list);
        setDefaultId(def);
        setDrafts(cleanDrafts);
        setActiveId(pick);
        setViewsLoaded(true);
      })();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // ---- active view + config -----------------------------------------------

  const activeView = views.find((v) => v.id === activeId) ?? null;
  const savedConfig = activeView?.config ?? DEFAULT_CONFIG;
  const config = (activeId && drafts[activeId]) || savedConfig;
  const dirty = activeId !== null && activeId !== LOCAL_VIEW && drafts[activeId] !== undefined && !same(drafts[activeId], savedConfig);

  // Keep the URL in step so a view (and its type) can be linked or bookmarked.
  useEffect(() => {
    if (!viewsLoaded || !activeId) return;
    const params = new URLSearchParams(searchParams.toString());
    if (activeId === LOCAL_VIEW) params.delete("v");
    else params.set("v", activeId);
    params.set("view", config.type);
    const next = `${pathname}?${params.toString()}`;
    if (next !== `${pathname}?${searchParams.toString()}`) router.replace(next, { scroll: false });
    if (activeId !== LOCAL_VIEW) writeStorage(ACTIVE_KEY, activeId);
  }, [viewsLoaded, activeId, config.type, pathname, router, searchParams]);

  const commitDrafts = (next: Record<string, ViewConfig>) => {
    setDrafts(next);
    writeStorage(DRAFTS_KEY, next);
  };

  const updateConfig = (patch: Partial<ViewConfig>) => {
    if (!activeId) return;
    const nextCfg = { ...config, ...patch };
    const next = { ...drafts };
    if (activeId !== LOCAL_VIEW && same(nextCfg, savedConfig)) delete next[activeId];
    else next[activeId] = nextCfg;
    commitDrafts(next);
  };

  const dropDraft = (id: string) => {
    if (!(id in drafts)) return;
    const next = { ...drafts };
    delete next[id];
    commitDrafts(next);
  };

  // ---- saved-view actions ---------------------------------------------------

  const api = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const createView = async (name: string, shared: boolean, config: ViewConfig) => {
    const { view } = (await api("/api/admin/pipeline-views", "POST", { name, shared, config })) as { view: PipelineViewDTO };
    setViews((vs) => [...vs.filter((v) => v.editable), view, ...vs.filter((v) => !v.editable)]);
    setActiveId(view.id);
    return view;
  };

  const handleCreate = async (name: string, shared: boolean, fromCurrent: boolean) => {
    try {
      await createView(name, shared, fromCurrent ? config : { ...DEFAULT_CONFIG, type: config.type });
      // The changes now live in the new view; the one they came from goes back to its saved state.
      if (fromCurrent && activeId) dropDraft(activeId);
      notify("ok", `View “${name}” created`);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Couldn't create the view");
    }
  };

  const handleRename = async (id: string, name: string) => {
    try {
      const { view } = (await api(`/api/admin/pipeline-views/${id}`, "PATCH", { name })) as { view: PipelineViewDTO };
      setViews((vs) => vs.map((v) => (v.id === id ? view : v)));
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Couldn't rename the view");
    }
  };

  const handleAction = async (id: string, action: "duplicate" | "delete" | "default" | "share") => {
    const view = views.find((v) => v.id === id);
    if (!view) return;
    try {
      if (action === "duplicate") {
        await createView(`${view.name} (copy)`.slice(0, 60), false, id === activeId ? config : view.config);
        notify("ok", `Duplicated “${view.name}”`);
      } else if (action === "delete") {
        await api(`/api/admin/pipeline-views/${id}`, "DELETE");
        const rest = views.filter((v) => v.id !== id);
        setViews(rest);
        dropDraft(id);
        if (defaultId === id) setDefaultId(null);
        if (activeId === id) setActiveId((defaultId !== id && defaultId) || rest[0]?.id || LOCAL_VIEW);
        notify("ok", `Deleted “${view.name}”`);
      } else if (action === "default") {
        await api("/api/admin/pipeline-views/default", "PUT", { viewId: id });
        setDefaultId(id);
        notify("ok", `“${view.name}” will open by default`);
      } else {
        const { view: updated } = (await api(`/api/admin/pipeline-views/${id}`, "PATCH", { shared: !view.shared })) as { view: PipelineViewDTO };
        setViews((vs) => vs.map((v) => (v.id === id ? updated : v)));
        notify("ok", updated.shared ? `“${view.name}” is now shared with the team` : `“${view.name}” is now private`);
      }
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "That didn't work");
    }
  };

  const handleSave = async () => {
    if (!activeView) return;
    setSaving(true);
    try {
      if (activeView.editable) {
        const { view } = (await api(`/api/admin/pipeline-views/${activeView.id}`, "PATCH", { config })) as { view: PipelineViewDTO };
        setViews((vs) => vs.map((v) => (v.id === view.id ? view : v)));
        dropDraft(activeView.id);
        notify("ok", `Saved “${view.name}”`);
      } else {
        // Someone else's shared view: keep theirs intact, save the changes as the user's own copy.
        const original = activeView.id;
        await createView(`${activeView.name} (my copy)`.slice(0, 60), false, config);
        dropDraft(original);
        notify("ok", `Saved as “${activeView.name} (my copy)”`);
      }
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Couldn't save the view");
    } finally {
      setSaving(false);
    }
  };

  // ---- lead actions -------------------------------------------------------------

  const patchLead = async (id: string, body: Record<string, unknown>, successText: string) => {
    const previous = leads;
    if (typeof body.status === "string") {
      const status = body.status;
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status, updatedAt: new Date().toISOString() } : l)));
    }
    try {
      await api(`/api/admin/businesses/${id}`, "PATCH", body);
      notify("ok", successText);
      await fetchLeads();
    } catch (err) {
      console.error("Status update error:", err);
      setLeads(previous);
      notify("error", "Couldn't update that lead — the change was undone.");
    }
  };

  // Every view funnels stage changes through here. Won asks for a deal value first.
  const moveLead = async (id: string, status: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === status) return;
    if (status === "CONVERTED") {
      setWonTarget(lead);
      return;
    }
    await patchLead(id, { status }, `${lead.name} moved to ${stageOf(status).label}`);
  };

  const confirmWon = async (dollars: number | undefined) => {
    const lead = wonTarget;
    setWonTarget(null);
    if (!lead) return;
    await patchLead(
      lead.id,
      { status: "CONVERTED", markWon: true, ...(dollars !== undefined ? { dealValueCents: Math.round(dollars * 100) } : {}) },
      `${lead.name} marked as won${dollars ? ` · ${formatMoney(Math.round(dollars * 100))}` : ""}`
    );
  };

  const runBulk = async (action: BulkAction, ids: string[]) => {
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch(action === "audit" ? "/api/admin/audits/run" : `/api/admin/businesses/${id}/outreach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "audit" ? JSON.stringify({ businessId: id }) : undefined,
        });
        if (res.ok) ok++;
        else failed++;
      } catch {
        failed++;
      }
    }
    const noun = (n: number) => `${n} lead${n === 1 ? "" : "s"}`;
    notify(
      failed && !ok ? "error" : "ok",
      action === "audit"
        ? `Queued audits for ${noun(ok)}${failed ? `, ${failed} failed` : ""}.`
        : `Sent outreach to ${noun(ok)}${failed ? `, ${failed} skipped (no verified contact or already sent)` : ""}.`
    );
    await fetchLeads();
  };

  const exportCsv = (rows: PipelineLead[]) => {
    const cols = ["Practice", ...config.columns.map((c) => COLUMN_LABELS[c]), "Website"];
    const value = (l: PipelineLead, c: (typeof config.columns)[number]) => {
      switch (c) {
        case "stage":
          return stageOf(l.status).label;
        case "opportunityScore":
          return l.opportunityScore;
        case "auditScore":
          return l.audit?.status === "COMPLETED" ? l.audit.score : "";
        case "auditStatus":
          return l.audit?.status ?? "";
        case "contact":
          return l.contact ? `${l.contact.name} <${l.contact.email}>` : "";
        case "outreachStatus":
          return l.outreachStatus ?? "";
        case "city":
          return l.city;
        case "province":
          return l.state ?? "";
        case "country":
          return l.country;
        case "dealValue":
          return l.dealValueCents != null ? (l.dealValueCents / 100).toFixed(2) : "";
        case "createdAt":
          return l.createdAt.slice(0, 10);
        case "updatedAt":
          return l.updatedAt.slice(0, 10);
      }
    };
    const lines = [cols, ...rows.map((l) => [l.name, ...config.columns.map((c) => value(l, c)), l.website])].map((r) => r.map(csvCell).join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pipeline-${(activeView?.name ?? "leads").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---- render ---------------------------------------------------------------------

  const visible = applyView(leads, config);
  const totalValue = visible.reduce((s, l) => s + (l.dealValueCents ?? 0), 0);
  const ready = leadsLoaded && viewsLoaded;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">Sales Pipeline</h1>
          <p className="text-body-small text-muted-foreground">
            {visible.length} of {leads.length} lead{leads.length === 1 ? "" : "s"}
            {totalValue > 0 && <> · {formatMoney(totalValue)} in deal value</>}
            {activeView && <> · {activeView.name}</>}
          </p>
        </div>

        <div role="tablist" aria-label="Layout" className="inline-flex self-start rounded-full border border-border bg-surface p-1">
          {TYPE_TABS.map((v) => {
            const on = config.type === v.key;
            return (
              <button
                key={v.key}
                role="tab"
                aria-selected={on}
                onClick={() => updateConfig({ type: v.key })}
                className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors ${
                  on ? "bg-background-dark text-white" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <v.Icon className="h-4 w-4" />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {viewsLoaded && (
        <ViewTabs
          views={views}
          activeId={activeId}
          defaultId={defaultId}
          dirty={dirty}
          saving={saving}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onRename={handleRename}
          onAction={handleAction}
          onSave={() => void handleSave()}
          onReset={() => activeId && dropDraft(activeId)}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <Toolbar config={config} onChange={updateConfig} />
        <button onClick={() => exportCsv(visible)} disabled={visible.length === 0} className={`${toolbarButton} disabled:opacity-50`}>
          Export CSV
        </button>
      </div>
      <FilterChips config={config} onChange={updateConfig} />

      {message && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-xs font-semibold ${
            message.tone === "ok" ? "border-primary/20 bg-accent-soft text-primary-ink" : "border-danger/20 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
          <button onClick={() => setMessage(null)} aria-label="Dismiss" className="text-current opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {!ready ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState title="No leads yet" message="Run a campaign to discover practices — they'll appear here." compact={false} />
      ) : config.type === "board" ? (
        <BoardView leads={visible} onMove={moveLead} />
      ) : config.type === "table" ? (
        <TableView leads={visible} config={config} onConfigChange={updateConfig} onMove={moveLead} onBulk={runBulk} onExport={exportCsv} />
      ) : config.type === "list" ? (
        <ListView leads={visible} config={config} onConfigChange={updateConfig} onMove={moveLead} />
      ) : (
        <SummaryView leads={visible} />
      )}

      {wonTarget && <WonDialog lead={wonTarget} onCancel={() => setWonTarget(null)} onConfirm={confirmWon} />}
    </div>
  );
}

function WonDialog({
  lead,
  onCancel,
  onConfirm,
}: {
  lead: PipelineLead;
  onCancel: () => void;
  onConfirm: (dollars: number | undefined) => void;
}) {
  const [value, setValue] = useState(lead.dealValueCents ? String(lead.dealValueCents / 100) : "");
  const dollars = value.trim() ? Number(value.trim()) : undefined;
  const invalid = dollars !== undefined && (Number.isNaN(dollars) || dollars < 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="won-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) onConfirm(dollars);
        }}
        className="admin-card w-full max-w-sm p-6 shadow-xl"
      >
        <h2 id="won-title" className="font-display text-xl font-bold text-foreground">
          Mark as won
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{lead.name}</p>
        <label htmlFor="deal-value" className="mt-5 block text-xs font-semibold text-foreground">
          Deal value (CAD) <span className="font-normal text-muted-foreground">— optional</span>
        </label>
        <input
          id="deal-value"
          autoFocus
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 2400"
          className="mt-1.5 h-11 w-full rounded-full border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {invalid && <p className="mt-1.5 text-xs font-semibold text-danger">Enter a positive number, or leave it blank.</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-10 rounded-full border border-border px-5 text-sm font-semibold text-foreground hover:bg-surface-muted">
            Cancel
          </button>
          <button type="submit" disabled={invalid} className="h-10 rounded-full bg-background-dark px-5 text-sm font-semibold text-white hover:bg-primary disabled:opacity-50">
            Mark won
          </button>
        </div>
      </form>
    </div>
  );
}

