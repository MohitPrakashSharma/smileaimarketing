"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Business = {
  id: string;
  name: string;
  website: string;
  status: string;
  opportunityScore: number;
  city: string;
};

const STAGES = [
  { label: "Discovered", value: "DISCOVERED", color: "text-muted-foreground" },
  { label: "Verified", value: "VERIFIED", color: "text-indigo-400" },
  { label: "Audited", value: "AUDITED", color: "text-primary" },
  { label: "Outreach Active", value: "OUTREACH_ACTIVE", color: "text-amber-400" },
  { label: "Meeting Requested", value: "MEETING_REQUESTED", color: "text-indigo-400" },
  { label: "Converted (Won)", value: "CONVERTED", color: "text-emerald-400" },
  { label: "Lost Lead", value: "LOST", color: "text-danger" },
];

export default function AdminPipelinePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [actionMessage, setActionMessage] = useState("");

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/businesses");
      const data = await res.json();
      if (res.ok) setBusinesses(data.businesses || []);
    } catch (err) {
      console.error("Error fetching pipeline:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPipeline();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPipeline]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setActionMessage("");
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setActionMessage(`Lead status updated to ${newStatus}`);
        await fetchPipeline();
      }
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-2 font-bold text-foreground">Sales Pipeline Command Centre</h1>
          <p className="mt-1 text-body-small text-muted-foreground">
            Track and move practice prospects through funnel conversion stages.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-body-small font-semibold text-primary">
          {actionMessage}
        </div>
      )}

      {/* Stage Columns */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {STAGES.map((stage) => {
          const list = businesses.filter((b) => b.status === stage.value);
          return (
            <div key={stage.value} className="flex flex-col rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>{stage.label}</span>
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
                  {list.length}
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {list.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border bg-background p-3 shadow-sm transition-colors hover:border-primary/40">
                    <Link href={`/admin/businesses/${b.id}`} className="block truncate text-body-small font-bold text-foreground hover:text-primary">
                      {b.name}
                    </Link>
                    <p className="truncate text-metadata text-muted-foreground">{b.city} • {b.website.replace(/^https?:\/\//, "")}</p>
                    
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2">
                      <span className="text-metadata font-bold text-primary">{b.opportunityScore}/100</span>
                      <div className="flex items-center gap-1.5">
                        {stage.value !== "CONVERTED" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "CONVERTED")}
                            className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20"
                          >
                            Won
                          </button>
                        )}
                        {stage.value !== "LOST" && (
                          <button
                            onClick={() => handleUpdateStatus(b.id, "LOST")}
                            className="rounded-md bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger hover:bg-danger/20"
                          >
                            Lost
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {list.length === 0 && (
                  <div className="py-8 text-center text-metadata text-muted-foreground/60">No practice in this stage</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
