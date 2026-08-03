"use client";

import { useEffect, useState } from "react";
import Eyebrow from "@/components/Eyebrow";

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<any[]>([]);
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
      console.error("Error fetching clinics:", err);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const handleRunAudit = async (businessId: string) => {
    setLoadingId(businessId);
    setError("");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/audit`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Audit execution failed");
      }
      fetchBusinesses();
    } catch (err: any) {
      setError(err.message || "Failed to trigger audit");
    } finally {
      setLoadingId(null);
    }
  };

  const handleStartOutreach = async (businessId: string) => {
    setLoadingId(businessId);
    setError("");
    try {
      const res = await fetch(`/api/admin/businesses/${businessId}/outreach`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start outreach sequence");
      }
      fetchBusinesses();
    } catch (err: any) {
      setError(err.message || "Failed to trigger outreach");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 font-body">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-semibold text-white">Discovered Dental Clinics</h3>
          <p className="text-xs text-slate mt-1">Manage discovered domains, view computed opportunity scores, and authorize outbound activities.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-coral/10 border border-coral/20 p-4 text-center text-sm font-semibold text-coral">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        {businesses.length === 0 ? (
          <div className="p-8 text-center text-slate text-sm">
            No dental clinics found in database. Create a Campaign to trigger auto-discovery.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate">
                  <th className="p-4">Clinic Name</th>
                  <th className="p-4">Website</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Opp. Score</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {businesses.map((b) => (
                  <tr key={b.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-semibold text-white">{b.name}</td>
                    <td className="p-4 text-slate text-xs">
                      <a href={b.website} target="_blank" rel="noopener noreferrer" className="hover:text-teal underline">
                        {b.website.replace("https://", "").replace("http://", "")}
                      </a>
                    </td>
                    <td className="p-4 text-slate text-xs">{b.city}, {b.country}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block rounded-full px-2 py-0.5 font-label text-[9px] uppercase tracking-wider ${
                        b.status === "CONVERTED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : b.status === "AUDITED"
                          ? "bg-teal/10 text-teal border border-teal/20"
                          : b.status === "OUTREACH_ACTIVE"
                          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                          : "bg-slate/10 text-slate border border-white/10"
                      }`}>
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-center font-display font-bold text-white">
                      {b.status === "DISCOVERED" ? "—" : `${b.opportunityScore}/100`}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {b.status === "DISCOVERED" && (
                        <button
                          onClick={() => handleRunAudit(b.id)}
                          disabled={loadingId !== null}
                          className="rounded-full bg-teal px-3 py-1.5 font-body text-[10px] font-bold text-ink hover:bg-teal-deep hover:text-white transition-colors disabled:bg-slate/50"
                        >
                          {loadingId === b.id ? "Auditing..." : "Audit Clinic"}
                        </button>
                      )}
                      {(b.status === "AUDITED" || b.status === "OUTREACH_PENDING") && (
                        <button
                          onClick={() => handleStartOutreach(b.id)}
                          disabled={loadingId !== null}
                          className="rounded-full bg-indigo-600 px-3 py-1.5 font-body text-[10px] font-bold text-white hover:bg-indigo-500 transition-colors disabled:bg-slate/50"
                        >
                          {loadingId === b.id ? "Processing..." : "Approve Outreach"}
                        </button>
                      )}
                      {(b.status === "OUTREACH_ACTIVE" || b.status === "CONVERTED") && (
                        <span className="text-[10px] font-bold text-slate italic pr-3">Authorized</span>
                      )}
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
