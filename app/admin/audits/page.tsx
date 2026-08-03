"use client";

import { useEffect, useState } from "react";

export default function AdminAuditsPage() {
  const [audits, setAudits] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAudits() {
      try {
        const res = await fetch("/api/admin/audits");
        const data = await res.json();
        if (res.ok) {
          setAudits(data.audits || []);
        }
      } catch (err) {
        console.error("Error fetching audits:", err);
      }
    }
    fetchAudits();
  }, []);

  return (
    <div className="space-y-6 font-body">
      <div>
        <h3 className="font-display text-xl font-semibold text-white">Generated Audit Reports</h3>
        <p className="text-xs text-slate mt-1">Review diagnostic scorecards and copy public audit links for clinical outreach.</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {audits.length === 0 ? (
          <div className="p-8 text-center text-slate text-sm">
            No audits generated in database. Go to discovered clinics to trigger audits.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate">
                  <th className="p-4">Clinic Name</th>
                  <th className="p-4">Created Date</th>
                  <th className="p-4 text-center">Score</th>
                  <th className="p-4 text-center">Public URL Token</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {audits.map((a) => (
                  <tr key={a.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white">{a.business?.name || "Clinic"}</td>
                    <td className="p-4 text-slate text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-center">
                      <span className="font-display font-bold text-teal">{a.score}/100</span>
                    </td>
                    <td className="p-4 text-center text-slate text-xs font-mono">{a.publicToken}</td>
                    <td className="p-4 text-right">
                      <a
                        href={`/audit/${a.publicToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-full border border-white/10 px-4 py-1.5 font-body text-[10px] font-bold text-white hover:border-teal hover:text-teal transition-colors"
                      >
                        View Report Page
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
