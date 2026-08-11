"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { IconCalendarCheck, IconAlertTriangle } from "@/components/icons";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { IconSearch } from "@/components/icons";

interface BusinessRow {
  id: string;
  name: string;
  website: string;
  city: string;
  country: string;
  status: string;
  opportunityScore: number;
  contact: { name: string; email: string; phone: string | null; source: string } | null;
  audit: { score: number; status: string; pdfStatus: string; publicToken: string } | null;
  outreachStatus: string | null;
}

interface AppointmentItem {
  id: string;
  type: "ONLINE" | "IN_PERSON";
  status: string;
  business?: { id: string; name: string; city?: string };
}

interface IntegrationStatusItem {
  key: string;
  name: string;
  status: string;
  details: string;
}

const SENT_STATUSES = new Set(["QUEUED", "SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"]);

export default function AdminOverviewPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchOverviewData = useCallback(async () => {
    try {
      const [bRes, apRes, iRes] = await Promise.all([
        fetch("/api/admin/businesses"),
        fetch("/api/admin/appointments"),
        fetch("/api/admin/integrations/status"),
      ]);
      const [bData, apData, iData] = await Promise.all([bRes.json(), apRes.json(), iRes.json()]);
      if (bRes.ok) setBusinesses(bData.businesses || []);
      if (apRes.ok) setAppointments(apData.appointments || []);
      if (iRes.ok) setIntegrations(iData.integrations || []);
    } catch (err) {
      console.error("Failed to load overview data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOverviewData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchOverviewData]);

  const filtered = useMemo(() => {
    if (!search) return businesses;
    const q = search.toLowerCase();
    return businesses.filter((b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q));
  }, [businesses, search]);

  const meetingsRequested = appointments.filter((ap) => ap.status === "REQUESTED");
  const integrationIssues = integrations.filter((i) => i.status === "MISSING" || i.status === "MOCKED" || i.status === "TEST_MODE");

  const contactsFoundCount = businesses.filter((b) => b.contact).length;
  const auditsCompleteCount = businesses.filter((b) => b.audit?.status === "COMPLETED").length;
  const outreachSentCount = businesses.filter((b) => b.outreachStatus && SENT_STATUSES.has(b.outreachStatus)).length;

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((b) => b.id)));
  };

  const runBulk = async (action: "audit" | "outreach") => {
    setBulkLoading(true);
    setMessage("");
    const ids = Array.from(selected);
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
    setMessage(
      action === "audit"
        ? `Queued audits for ${ok} practice${ok === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}.`
        : `Sent outreach for ${ok} practice${ok === 1 ? "" : "s"}${failed ? `, ${failed} skipped (no verified contact or already sent)` : ""}.`
    );
    setSelected(new Set());
    setBulkLoading(false);
    await fetchOverviewData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Overview</h1>
        <p className="text-body-small text-muted-foreground">
          Every practice, what&apos;s been found for it, and where it stands — in one place.
        </p>
      </div>

      {/* Real, simple stat row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Practices</span>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{businesses.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Contacts Found</span>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{contactsFoundCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Audits Completed</span>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{auditsCompleteCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Outreach Sent</span>
          <p className="mt-2 text-2xl font-extrabold text-foreground">{outreachSentCount}</p>
        </div>
      </div>

      {message && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-xs font-bold text-primary">
          {message}
        </div>
      )}

      {/* One table, every practice, real bulk actions */}
      <AdminCard
        header={<h2 className="text-xs font-bold uppercase tracking-wider text-foreground">All Practices</h2>}
        action={
          <div className="relative w-56">
            <IconSearch className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or city..."
              className="h-7 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState title="No practices yet" message="Run a campaign to auto-discover practices." />
        ) : (
          <>
            {selected.size > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-primary/10 p-2.5">
                <span className="text-xs font-bold text-primary">{selected.size} selected</span>
                <button
                  onClick={() => runBulk("audit")}
                  disabled={bulkLoading}
                  className="inline-flex h-7 items-center rounded-md bg-primary px-3 text-[11px] font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                >
                  Run Audit
                </button>
                <button
                  onClick={() => runBulk("outreach")}
                  disabled={bulkLoading}
                  className="inline-flex h-7 items-center rounded-md bg-emerald-500/10 px-3 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                >
                  Send Outreach
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="w-8 px-3 py-2.5">
                      <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} />
                    </th>
                    <th className="px-3 py-2.5">Practice</th>
                    <th className="px-3 py-2.5">Contact</th>
                    <th className="px-3 py-2.5 text-center">Audit</th>
                    <th className="px-3 py-2.5 text-center">Outreach</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-surface-muted/30">
                      <td className="px-3 py-2.5">
                        <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleRow(b.id)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/admin/businesses/${b.id}`} className="font-bold text-foreground hover:text-primary hover:underline">
                          {b.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground">{b.city}, {b.country}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        {b.contact ? (
                          <>
                            <p className="font-semibold text-foreground">{b.contact.name}</p>
                            <p className="text-[11px] text-muted-foreground">{b.contact.email}</p>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-amber-400">Not found yet</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {b.audit ? (
                          <span className="font-extrabold text-primary">{b.audit.score}/100</span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <StatusBadge status={b.outreachStatus || "PENDING"} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/admin/businesses/${b.id}`}
                          className="inline-flex h-7 items-center rounded-md bg-surface-muted px-2.5 text-[11px] font-bold text-foreground hover:bg-border"
                        >
                          View &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminCard>

      {/* Secondary, still-real, still-human items */}
      <div className="grid gap-5 md:grid-cols-2">
        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconCalendarCheck className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Meetings Requiring Action</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                {meetingsRequested.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/meetings" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          }
        >
          {meetingsRequested.length === 0 ? (
            <EmptyState title="No pending meeting requests" message="All consultation requests have been scheduled." />
          ) : (
            <ul className="divide-y divide-border/50">
              {meetingsRequested.slice(0, 5).map((app) => (
                <li key={app.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{app.business?.name || "Practice Request"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {app.type === "ONLINE" ? "Video Consultation" : "In-Person Visit"}
                    </p>
                  </div>
                  <Link
                    href="/admin/meetings"
                    className="inline-flex h-8 items-center rounded-lg bg-emerald-500/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                  >
                    Schedule
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>

        <AdminCard
          header={
            <div className="flex items-center gap-2">
              <IconAlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Integration Warnings</h2>
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                {integrationIssues.length}
              </span>
            </div>
          }
          action={
            <Link href="/admin/integrations" className="text-xs font-bold text-primary hover:underline">
              View status
            </Link>
          }
        >
          {integrationIssues.length === 0 ? (
            <EmptyState title="All integrations healthy" message="All background services and APIs are connected." />
          ) : (
            <ul className="divide-y divide-border/50">
              {integrationIssues.map((integ) => (
                <li key={integ.key} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{integ.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{integ.details}</p>
                  </div>
                  <Link
                    href="/admin/integrations"
                    className="inline-flex h-8 items-center rounded-lg bg-surface-muted px-3 text-xs font-bold text-foreground hover:bg-border"
                  >
                    Check
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
