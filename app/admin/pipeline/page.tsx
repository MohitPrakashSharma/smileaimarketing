"use client";

import { useEffect, useState } from "react";

type Business = {
  id: string;
  name: string;
  website: string;
  status: string;
  opportunityScore: number;
};

const STAGES = [
  { label: "Discovered", value: "DISCOVERED" },
  { label: "Audited", value: "AUDITED" },
  { label: "Outreach Active", value: "OUTREACH_ACTIVE" },
  { label: "Converted / Booked", value: "CONVERTED" },
];

export default function AdminPipelinePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    async function fetchPipeline() {
      try {
        const res = await fetch("/api/admin/businesses");
        const data = await res.json();
        if (res.ok) setBusinesses(data.businesses || []);
      } catch (err) {
        console.error("Error fetching pipeline:", err);
      }
    }
    fetchPipeline();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-foreground">Sales Pipeline</h1>
        <p className="mt-1 text-body-small text-muted-foreground">
          Track status from initial discovery to confirmed consultations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage) => {
          const list = businesses.filter((b) => b.status === stage.value);
          return (
            <div key={stage.value} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-metadata font-bold uppercase tracking-wider text-foreground">{stage.label}</span>
                <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {list.length}
                </span>
              </div>

              <div className="mt-3 space-y-2.5">
                {list.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40">
                    <p className="truncate text-metadata font-bold text-foreground">{b.name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {b.website.replace(/^https?:\/\//, "")}
                    </p>
                    {b.opportunityScore > 0 && (
                      <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
                        <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Score</span>
                        <span className="text-metadata font-bold text-primary">{b.opportunityScore}/100</span>
                      </div>
                    )}
                  </div>
                ))}
                {list.length === 0 && (
                  <div className="py-8 text-center text-metadata text-muted-foreground/70">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
