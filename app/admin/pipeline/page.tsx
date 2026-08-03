"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { label: "Discovered", value: "DISCOVERED" },
  { label: "Audited", value: "AUDITED" },
  { label: "Outreach Active", value: "OUTREACH_ACTIVE" },
  { label: "Converted / Booked", value: "CONVERTED" },
];

export default function AdminPipelinePage() {
  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    async function fetchPipeline() {
      try {
        const res = await fetch("/api/admin/businesses");
        const data = await res.json();
        if (res.ok) {
          setBusinesses(data.businesses || []);
        }
      } catch (err) {
        console.error("Error fetching pipeline:", err);
      }
    }
    fetchPipeline();
  }, []);

  return (
    <div className="space-y-6 font-body">
      <div>
        <h3 className="font-display text-xl font-semibold text-white">Sales Pipeline</h3>
        <p className="text-xs text-slate mt-1 font-body">Track status conversions from initial clinic discovery to confirmed consultations.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-4 items-start">
        {STAGES.map((stage) => {
          const list = businesses.filter((b) => b.status === stage.value);
          return (
            <div key={stage.value} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="font-display text-xs font-bold text-white uppercase tracking-wider">{stage.label}</span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate">{list.length}</span>
              </div>

              <div className="space-y-3 min-h-[300px]">
                {list.map((b) => (
                  <div key={b.id} className="rounded-xl bg-ink-2 p-3 border border-white/5 space-y-2 hover:border-teal/30 transition-colors">
                    <p className="text-xs font-bold text-white leading-snug">{b.name}</p>
                    <p className="text-[10px] text-slate font-mono overflow-hidden text-ellipsis whitespace-nowrap">{b.website.replace("https://", "").replace("http://", "")}</p>
                    {b.opportunityScore > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[9px] font-label uppercase tracking-widest text-slate">Opp. Score</span>
                        <span className="text-xs font-bold text-teal">{b.opportunityScore}/100</span>
                      </div>
                    )}
                  </div>
                ))}
                {list.length === 0 && (
                  <div className="text-center text-[11px] text-slate/50 py-12">Empty</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
