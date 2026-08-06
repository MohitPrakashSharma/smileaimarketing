"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { EmptyState } from "@/components/admin/EmptyState";
import { IconSearch } from "@/components/icons";

type Business = {
  id: string;
  name: string;
  website: string;
  city: string;
  country: string;
  status: string;
  opportunityScore: number;
  contactCount?: number;
  updatedAt?: string;
};

function BusinessesList() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").toLowerCase();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(query);

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/businesses");
      const data = await res.json();
      if (res.ok) {
        setBusinesses(data.businesses || []);
      }
    } catch (err) {
      console.error("Error fetching businesses:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchBusinesses();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchBusinesses]);

  const handleRunAudit = async (businessId: string) => {
    setLoadingId(businessId);
    setError("");
    try {
      const res = await fetch(`/api/admin/audits/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit execution failed");
      await fetchBusinesses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to trigger audit");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = search
    ? businesses.filter(
        (b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.city.toLowerCase().includes(search.toLowerCase())
      )
    : businesses;

  // The pipeline (discovery -> contact enrichment -> audit -> PDF -> outreach)
  // runs automatically end to end. "Run Audit" here is a manual retry for a
  // stuck job, not a required step — everything else is just a status link.
  const renderPrimaryAction = (b: Business) => {
    if (b.status === "DISCOVERED") {
      return (
        <button
          onClick={() => handleRunAudit(b.id)}
          disabled={loadingId !== null}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {loadingId === b.id ? "Auditing..." : "Run Audit"}
        </button>
      );
    }
    return (
      <Link
        href={`/admin/businesses/${b.id}`}
        className="inline-flex h-8 items-center rounded-lg bg-surface-muted px-3 text-xs font-bold text-foreground transition-colors hover:bg-border"
      >
        View Details
      </Link>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Practice Leads</h1>
          <p className="text-body-small text-muted-foreground">
            View practice lead status, opportunity scores, and execute next operational actions.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-xs font-bold text-danger">
          {error}
        </div>
      )}

      {/* Search Input */}
      <div className="relative max-w-md">
        <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter leads by practice name or city..."
          className="h-9 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={businesses.length === 0 ? "No leads discovered yet" : "No leads match search"}
          message={businesses.length === 0 ? "Run a campaign to auto-discover practices." : "Try adjusting your search query."}
        />
      ) : (
        <>
          {/* Mobile Cards (< 1024px) */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((b) => (
              <div key={b.id} className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/admin/businesses/${b.id}`} className="font-bold text-foreground text-sm hover:text-primary">
                      {b.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{b.city}, {b.country}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <span className="font-bold text-primary">Score: {b.opportunityScore}/100</span>
                  <span className="text-muted-foreground">{b.contactCount ? `${b.contactCount} contact(s)` : "No contact"}</span>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  {renderPrimaryAction(b)}
                  <ActionMenu
                    items={[
                      { label: "View Practice", onClick: () => (window.location.href = `/admin/businesses/${b.id}`) },
                      { label: "Retry Audit", onClick: () => handleRunAudit(b.id) },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table (>= 1024px) */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-xs lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Practice</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Stage</th>
                    <th className="px-4 py-3 text-center">Contact Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filtered.map((b) => (
                    <tr key={b.id} className="transition-colors hover:bg-surface-muted/30">
                      <td className="px-4 py-3 font-bold text-foreground">
                        <Link href={`/admin/businesses/${b.id}`} className="hover:text-primary hover:underline">
                          {b.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.city}, {b.country}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-foreground">
                        {b.status === "DISCOVERED" ? "—" : `${b.opportunityScore}/100`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {b.contactCount ? (
                          <span className="font-semibold text-emerald-400">{b.contactCount} captured</span>
                        ) : (
                          <span className="text-amber-400 font-semibold">Missing</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {renderPrimaryAction(b)}
                          <ActionMenu
                            items={[
                              { label: "View Practice Detail", onClick: () => (window.location.href = `/admin/businesses/${b.id}`) },
                              { label: "Retry Audit", onClick: () => handleRunAudit(b.id) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminBusinessesPage() {
  return (
    <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />}>
      <BusinessesList />
    </Suspense>
  );
}
