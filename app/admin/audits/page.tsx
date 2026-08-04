"use client";

import { useEffect, useState } from "react";

type Audit = {
  id: string;
  score: number;
  publicToken: string;
  createdAt: string;
  business?: { name: string; website: string };
};

export default function AdminAuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);

  useEffect(() => {
    async function fetchAudits() {
      try {
        const res = await fetch("/api/admin/audits");
        const data = await res.json();
        if (res.ok) setAudits(data.audits || []);
      } catch (err) {
        console.error("Error fetching audits:", err);
      }
    }
    fetchAudits();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-foreground">Generated Audit Reports</h1>
        <p className="mt-1 text-body-small text-muted-foreground">
          Review diagnostic scorecards and share public audit links.
        </p>
      </div>

      {audits.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-body-small text-muted-foreground">
          No audits generated yet. Trigger one from Businesses.
        </div>
      ) : (
        <>
          {/* Mobile: card list */}
          <div className="space-y-3 lg:hidden">
            {audits.map((a) => (
              <a
                key={a.id}
                href={`/audit/${a.publicToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-semibold text-foreground">{a.business?.name || "Practice"}</p>
                  <span className="shrink-0 font-bold text-primary">{a.score}/100</span>
                </div>
                <p className="mt-1 text-metadata text-muted-foreground">
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
                <p className="mt-2 truncate font-mono text-metadata text-muted-foreground">{a.publicToken}</p>
              </a>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface lg:block">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="p-4">Business</th>
                    <th className="p-4">Created</th>
                    <th className="p-4 text-center">Score</th>
                    <th className="p-4 text-center">Public Token</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-body-small">
                  {audits.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-surface-muted/40">
                      <td className="p-4 font-semibold text-foreground">{a.business?.name || "Practice"}</td>
                      <td className="p-4 text-metadata text-muted-foreground">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-center font-bold text-primary">{a.score}/100</td>
                      <td className="p-4 text-center font-mono text-metadata text-muted-foreground">{a.publicToken}</td>
                      <td className="p-4 text-right">
                        <a
                          href={`/audit/${a.publicToken}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center rounded-full border border-border px-4 text-metadata font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                          View Report
                        </a>
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
