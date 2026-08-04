"use client";

import { useEffect, useRef, useState } from "react";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";

type Campaign = {
  id: string;
  name: string;
  city: string;
  category: string;
  status: string;
  _count?: { businesses: number };
  businesses?: { status: string }[];
};

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Dental Clinic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, category }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      setName("");
      setCity("");
      fetchCampaigns();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[63%_37%]">
      {/* Campaigns list */}
      <div className="space-y-4">
        <h1 className="text-heading-2 font-semibold text-foreground">Active Campaigns</h1>

        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-body-small text-muted-foreground">
            No campaigns configured yet. Create one to begin discovery.
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-body font-bold text-foreground">{c.name}</h3>
                    <p className="mt-1 text-metadata text-muted-foreground">
                      <span className="font-semibold text-primary">{c.category}</span> &bull; {c.city}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      c.status === "ACTIVE"
                        ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border border-border bg-muted-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                  <div>
                    <span className="block text-metadata text-muted-foreground">Found</span>
                    <span className="mt-0.5 block font-bold text-primary">{c._count?.businesses || 0}</span>
                  </div>
                  <div>
                    <span className="block text-metadata text-muted-foreground">Audited</span>
                    <span className="mt-0.5 block font-bold text-primary">
                      {c.businesses?.filter((b) => b.status === "AUDITED" || b.status === "CONVERTED").length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="block text-metadata text-muted-foreground">Converted</span>
                    <span className="mt-0.5 block font-bold text-primary">
                      {c.businesses?.filter((b) => b.status === "CONVERTED").length || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create campaign form */}
      <div className="h-fit rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-body font-bold text-foreground">New Outbound Search</h2>
        <p className="mt-1 text-metadata text-muted-foreground">
          Discovers and analyzes practices in a city automatically.
        </p>

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateCampaign} className="mt-4 space-y-4" noValidate>
          <FormField id="campaign-name" label="Campaign Title" required optionalLabel={false}>
            <Input
              id="campaign-name"
              type="text"
              required
              placeholder="e.g. Chicago North Prospecting"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField id="campaign-city" label="Target City" required optionalLabel={false}>
            <Input
              id="campaign-city"
              type="text"
              required
              autoComplete="address-level2"
              placeholder="e.g. Chicago"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </FormField>
          <FormField id="campaign-category" label="Clinic Category" optionalLabel={false}>
            <Select id="campaign-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="Dental Clinic">General Dentist</option>
              <option value="Orthodontist">Orthodontist</option>
              <option value="Pediatric Dentist">Pediatric Dentist</option>
              <option value="Periodontist">Periodontist</option>
            </Select>
          </FormField>

          <Button type="submit" fullWidth loading={loading} disabled={loading}>
            Start Search
          </Button>
        </form>
      </div>
    </div>
  );
}
