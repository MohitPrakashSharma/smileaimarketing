"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";

type Business = {
  id: string;
  name: string;
  website: string;
  city: string;
  country: string;
  status: string;
  opportunityScore: number;
};

const STATUS_CLASSES: Record<string, string> = {
  CONVERTED: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  AUDITED: "bg-primary/10 text-primary border border-primary/20",
  OUTREACH_ACTIVE: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
};
const DEFAULT_STATUS_CLASS = "bg-muted-foreground/10 text-muted-foreground border border-border";

function BusinessesList() {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").toLowerCase();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchBusinesses = async () => {
    try {
      const res = await fetch("/api/admin/businesses");
      const data = await res.json();
      if (res.ok) {
        setBusinesses(data.businesses || []);
      }
    } catch (err) {
      console.error("Error fetching businesses:", err);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleRunAudit = async (businessId: string) => {
    setLoadingId(businessId);
    setError("");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/audit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit execution failed");
      fetchBusinesses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to trigger audit");
    } finally {
      setLoadingId(null);
    }
  };

  const handleStartOutreach = async (businessId: string) => {
    setLoadingId(businessId);
    setError("");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/outreach`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start outreach sequence");
      fetchBusinesses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to trigger outreach");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = query
    ? businesses.filter(
        (b) => b.name.toLowerCase().includes(query) || b.website.toLowerCase().includes(query)
      )
    : businesses;

  const renderActions = (b: Business) => {
    if (b.status === "DISCOVERED") {
      return (
        <Button
          variant="primary"
          className="!h-11 !px-4 !text-metadata"
          onClick={() => handleRunAudit(b.id)}
          disabled={loadingId !== null}
          loading={loadingId === b.id}
        >
          Audit
        </Button>
      );
    }
    if (b.status === "AUDITED" || b.status === "OUTREACH_PENDING") {
      return (
        <Button
          variant="secondary"
          className="!h-11 !px-4 !text-metadata"
          onClick={() => handleStartOutreach(b.id)}
          disabled={loadingId !== null}
          loading={loadingId === b.id}
        >
          Approve Outreach
        </Button>
      );
    }
    return <span className="text-metadata font-semibold italic text-muted-foreground">Authorized</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-foreground">Discovered Businesses</h1>
        <p className="mt-1 text-body-small text-muted-foreground">
          Manage discovered practices, view opportunity scores, and authorize outreach.
          {query && ` Showing results for "${query}".`}
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-center text-body-small font-semibold text-danger">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-body-small text-muted-foreground">
          {businesses.length === 0
            ? "No businesses found. Create a campaign to trigger auto-discovery."
            : "No businesses match your search."}
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((b) => (
              <div key={b.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/businesses/${b.id}`} className="min-w-0 hover:opacity-80">
                    <p className="truncate font-semibold text-foreground">{b.name}</p>
                    <p className="truncate text-metadata text-muted-foreground">
                      {b.website.replace(/^https?:\/\//, "")}
                    </p>
                    <p className="mt-0.5 text-metadata text-muted-foreground">{b.city}, {b.country}</p>
                  </Link>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASSES[b.status] || DEFAULT_STATUS_CLASS}`}>
                    {b.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-body-small font-bold text-foreground">
                    {b.status === "DISCOVERED" ? "No score yet" : `${b.opportunityScore}/100`}
                  </span>
                  {renderActions(b)}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Business</th>
                    <th className="p-4">Website</th>
                    <th className="p-4">Location</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Score</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-body-small">
                  {filtered.map((b) => (
                    <tr key={b.id} className="transition-colors hover:bg-surface-muted/40">
                      <td className="p-4 font-semibold text-foreground">
                        <Link href={`/admin/businesses/${b.id}`} className="hover:text-primary hover:underline">
                          {b.name}
                        </Link>
                      </td>
                      <td className="p-4 text-metadata text-muted-foreground">
                        <a href={b.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                          {b.website.replace(/^https?:\/\//, "")}
                        </a>
                      </td>
                      <td className="p-4 text-metadata text-muted-foreground">{b.city}, {b.country}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_CLASSES[b.status] || DEFAULT_STATUS_CLASS}`}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-foreground">
                        {b.status === "DISCOVERED" ? "—" : `${b.opportunityScore}/100`}
                      </td>
                      <td className="p-4 text-right">{renderActions(b)}</td>
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
