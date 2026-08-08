"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { EmptyState } from "@/components/admin/EmptyState";

type Audit = {
  id: string;
  score: number;
  status?: string;
  pdfStatus?: string;
  publicToken: string;
  createdAt: string;
  business?: { id: string; name: string; website: string };
};

export default function AdminAuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudits() {
      try {
        const res = await fetch("/api/admin/audits");
        const data = await res.json();
        if (res.ok) setAudits(data.audits || []);
      } catch (err) {
        console.error("Error fetching audits:", err);
      } finally {
        setLoading(false);
      }
    }
    void fetchAudits();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  const renderPrimaryAction = (a: Audit) => {
    if (a.pdfStatus === "READY") {
      return (
        <a
          href={`/api/audit/${a.publicToken}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 items-center rounded-lg bg-emerald-500/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
        >
          Download PDF
        </a>
      );
    }
    return (
      <a
        href={`/audit/${a.publicToken}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
      >
        Review Audit
      </a>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Audit Reports</h1>
          <p className="text-body-small text-muted-foreground">
            Review practice diagnostic scores, live report web pages, and generated PDF files.
          </p>
        </div>
      </div>

      {audits.length === 0 ? (
        <EmptyState
          title="No audits generated yet"
          message="Run an audit on any discovered practice lead to create a report."
        />
      ) : (
        <>
          {/* Mobile Cards (< 1024px) */}
          <div className="space-y-3 lg:hidden">
            {audits.map((a) => (
              <div key={a.id} className="rounded-xl border border-border bg-surface p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-foreground text-sm">{a.business?.name || "Practice Audit"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="font-extrabold text-primary text-sm">{a.score}/100</span>
                </div>

                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-xs">
                  <StatusBadge status={a.status || "COMPLETED"} />
                  <StatusBadge status={a.pdfStatus || "READY"} />
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-2">
                  {renderPrimaryAction(a)}
                  <ActionMenu
                    items={[
                      { label: "View Public Report", onClick: () => window.open(`/audit/${a.publicToken}`, "_blank") },
                      { label: "Download PDF Report", onClick: () => window.open(`/api/audit/${a.publicToken}/pdf`, "_blank") },
                      ...(a.business?.id ? [{ label: "View Lead Detail", onClick: () => (window.location.href = `/admin/businesses/${a.business?.id}`) }] : []),
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
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Audit Status</th>
                    <th className="px-4 py-3 text-center">PDF Status</th>
                    <th className="px-4 py-3 text-center">Generated</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {audits.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-surface-muted/30">
                      <td className="px-4 py-3 font-bold text-foreground">
                        {a.business?.id ? (
                          <Link href={`/admin/businesses/${a.business.id}`} className="hover:text-primary hover:underline">
                            {a.business.name}
                          </Link>
                        ) : (
                          a.business?.name || "Practice Audit"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-primary">{a.score}/100</td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={a.status || "COMPLETED"} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={a.pdfStatus || "READY"} />
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {renderPrimaryAction(a)}
                          <ActionMenu
                            items={[
                              { label: "View Public Report", onClick: () => window.open(`/audit/${a.publicToken}`, "_blank") },
                              { label: "Download PDF Report", onClick: () => window.open(`/api/audit/${a.publicToken}/pdf`, "_blank") },
                              ...(a.business?.id ? [{ label: "View Lead Detail", onClick: () => (window.location.href = `/admin/businesses/${a.business?.id}`) }] : []),
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
