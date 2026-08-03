"use client";

import { useEffect, useState } from "react";
import Eyebrow from "@/components/Eyebrow";

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Dental Clinic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (res.ok) {
        setCampaigns(data.campaigns || []);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, category }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      setName("");
      setCity("");
      fetchCampaigns();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 font-body">
      <div className="grid gap-8 lg:grid-cols-[65%_35%]">
        
        {/* Left Column: Campaigns List */}
        <div className="space-y-6">
          <h3 className="font-display text-xl font-semibold text-white">Active Campaigns</h3>
          
          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/5 p-8 text-center text-slate">
              No prospecting campaigns configured yet. Create one to begin local business discovery.
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((c) => (
                <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-teal/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display text-lg font-bold text-white">{c.name}</h4>
                      <p className="text-xs text-slate mt-1">
                        Category: <span className="text-teal font-semibold">{c.category}</span> &bull; Location: <span className="text-teal font-semibold">{c.city}</span>
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 font-label text-[10px] uppercase tracking-wider ${
                      c.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-slate/10 text-slate border border-white/10"
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Campaign Metrics */}
                  <div className="mt-6 grid grid-cols-3 gap-4 text-center border-t border-white/10 pt-4">
                    <div>
                      <span className="block font-label text-[10px] uppercase tracking-wider text-slate">Clinics Found</span>
                      <span className="font-display text-xl font-bold text-teal mt-1 block">{c._count?.businesses || 0}</span>
                    </div>
                    <div>
                      <span className="block font-label text-[10px] uppercase tracking-wider text-slate">Audited</span>
                      <span className="font-display text-xl font-bold text-teal mt-1 block">
                        {c.businesses?.filter((b: any) => b.status === "AUDITED" || b.status === "CONVERTED").length || 0}
                      </span>
                    </div>
                    <div>
                      <span className="block font-label text-[10px] uppercase tracking-wider text-slate">Converted</span>
                      <span className="font-display text-xl font-bold text-teal mt-1 block">
                        {c.businesses?.filter((b: any) => b.status === "CONVERTED").length || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Create Campaign Form */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold text-white">New Outbound Search</h3>
            <p className="text-xs text-slate">Discovers and analyzes clinics in a selected city automatically.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-coral/10 border border-coral/20 p-4 text-center text-sm font-semibold text-coral">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label htmlFor="campaign-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Campaign Title</label>
              <input
                id="campaign-name"
                type="text"
                required
                placeholder="e.g. Chicago North Prospecting"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="campaign-city" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Target City</label>
              <input
                id="campaign-city"
                type="text"
                required
                placeholder="e.g. Chicago"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="campaign-category" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Clinic Category</label>
              <select
                id="campaign-category"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Dental Clinic">General Dentist</option>
                <option value="Orthodontist">Orthodontist</option>
                <option value="Pediatric Dentist">Pediatric Dentist</option>
                <option value="Periodontist">Periodontist</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal py-4 text-xs font-bold text-ink hover:bg-teal-deep hover:text-white transition-colors"
            >
              {loading ? "Discovering Businesses..." : "Initiate Outbound Search"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
