"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ProgressSteps from "@/components/ui/ProgressSteps";

type Campaign = {
  id: string;
  name: string;
  city: string;
  category: string;
  status: string;
  _count?: { businesses: number };
  businesses?: { status: string }[];
};

const STEP_LABELS = ["Target Market", "Lead Criteria", "Audit Config", "Outreach Config", "Review & Start"];

const CATEGORY_OPTIONS = [
  { value: "Dental Clinic", label: "General Dentist" },
  { value: "Orthodontist", label: "Orthodontist" },
  { value: "Pediatric Dentist", label: "Pediatric Dentist" },
  { value: "Periodontist", label: "Periodontist" },
];

const COUNTRY_OPTIONS = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "UK", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
];

function CampaignWizard({ onCreated }: { onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  // Step 1: Target market
  const [name, setName] = useState("");
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Dental Clinic");
  const [step1Error, setStep1Error] = useState("");

  // Step 2: Lead criteria
  const [maxBusinesses, setMaxBusinesses] = useState(10);
  const [minReviewCount, setMinReviewCount] = useState("");
  const [websiteRequired, setWebsiteRequired] = useState(true);
  const [excludeChains, setExcludeChains] = useState(false);
  const [excludeExistingContacts, setExcludeExistingContacts] = useState(false);

  // Step 3: Audit configuration
  const [keywordsInput, setKeywordsInput] = useState("");
  const [competitorCount, setCompetitorCount] = useState(3);
  const [dataFreshnessDays, setDataFreshnessDays] = useState(30);

  // Step 4: Outreach configuration
  const [outreachDailyLimit, setOutreachDailyLimit] = useState(8);
  const [testMode, setTestMode] = useState(true);

  const keywords = keywordsInput
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const goNext = () => {
    if (step === 1) {
      if (!name.trim() || name.trim().length < 3) {
        setStep1Error("Campaign name must be at least 3 characters.");
        return;
      }
      if (!city.trim()) {
        setStep1Error("City is required.");
        return;
      }
      setStep1Error("");
    }
    setStep((s) => Math.min(s + 1, 5));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleStart = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          country,
          state: state || undefined,
          city,
          category,
          maxBusinesses,
          minReviewCount: minReviewCount ? Number(minReviewCount) : undefined,
          websiteRequired,
          excludeChains,
          excludeExistingContacts,
          keywords,
          competitorCount,
          dataFreshnessDays,
          dataProvider: "MOCK",
          outreachDailyLimit,
          testMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      // Reset for next campaign
      setStep(1);
      setName("");
      setState("");
      setCity("");
      setKeywordsInput("");
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="h-fit rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-body font-bold text-foreground">New Outbound Campaign</h2>
      <p className="mt-1 text-metadata text-muted-foreground">
        Configure target market, lead criteria, audit scope, and outreach limits.
      </p>

      <div className="mt-4">
        <ProgressSteps steps={STEP_LABELS} current={step} />
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {step === 1 && (
          <>
            <FormField id="campaign-name" label="Campaign Title" required optionalLabel={false} error={step1Error && !name.trim() ? step1Error : undefined}>
              <Input
                id="campaign-name"
                type="text"
                required
                placeholder="e.g. Chicago North Prospecting"
                value={name}
                onChange={(e) => setName(e.target.value)}
                hasError={!!step1Error && !name.trim()}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="campaign-country" label="Country" optionalLabel={false}>
                <Select id="campaign-country" value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </FormField>
              <FormField id="campaign-state" label="State / Region">
                <Input id="campaign-state" type="text" placeholder="e.g. IL" value={state} onChange={(e) => setState(e.target.value)} />
              </FormField>
            </div>
            <FormField id="campaign-city" label="Target City" required optionalLabel={false} error={step1Error && !city.trim() ? step1Error : undefined}>
              <Input
                id="campaign-city"
                type="text"
                required
                autoComplete="address-level2"
                placeholder="e.g. Chicago"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                hasError={!!step1Error && !city.trim()}
              />
            </FormField>
            <FormField id="campaign-category" label="Business Category" optionalLabel={false}>
              <Select id="campaign-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </FormField>
          </>
        )}

        {step === 2 && (
          <>
            <FormField id="max-businesses" label="Maximum Businesses" optionalLabel={false} hint="Keep this small (5-10) for a first controlled test.">
              <Input
                id="max-businesses"
                type="number"
                min={1}
                max={50}
                value={maxBusinesses}
                onChange={(e) => setMaxBusinesses(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </FormField>
            <FormField id="min-reviews" label="Minimum Review Count">
              <Input
                id="min-reviews"
                type="number"
                min={0}
                placeholder="No minimum"
                value={minReviewCount}
                onChange={(e) => setMinReviewCount(e.target.value)}
              />
            </FormField>
            <div className="space-y-3 rounded-xl border border-border bg-background p-4">
              <label className="flex items-center gap-3 text-body-small text-foreground">
                <input type="checkbox" className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary" checked={websiteRequired} onChange={(e) => setWebsiteRequired(e.target.checked)} />
                Require a website to qualify
              </label>
              <label className="flex items-center gap-3 text-body-small text-foreground">
                <input type="checkbox" className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary" checked={excludeChains} onChange={(e) => setExcludeChains(e.target.checked)} />
                Exclude large dental chains
              </label>
              <label className="flex items-center gap-3 text-body-small text-foreground">
                <input type="checkbox" className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary" checked={excludeExistingContacts} onChange={(e) => setExcludeExistingContacts(e.target.checked)} />
                Exclude businesses with an existing contact
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <FormField id="keywords" label="Keywords" hint="Comma-separated, e.g. dentist, teeth whitening, family dentistry">
              <Input id="keywords" type="text" placeholder="dentist, family dentistry" value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="competitor-count" label="Competitors to Compare" optionalLabel={false}>
                <Input
                  id="competitor-count"
                  type="number"
                  min={1}
                  max={10}
                  value={competitorCount}
                  onChange={(e) => setCompetitorCount(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                />
              </FormField>
              <FormField id="freshness" label="Data Freshness (days)" optionalLabel={false}>
                <Input
                  id="freshness"
                  type="number"
                  min={1}
                  max={90}
                  value={dataFreshnessDays}
                  onChange={(e) => setDataFreshnessDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
                />
              </FormField>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 text-body-small text-muted-foreground">
              Every audit currently checks SSL, response time, and mobile viewport in real time. Local visibility and
              competitor data require Google Places / DataForSEO, which aren&apos;t connected yet — see{" "}
              <span className="font-mono text-metadata">docs/mvp-readiness.md</span>.
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <FormField id="daily-limit" label="Outreach Daily Limit" optionalLabel={false} hint="Matches OUTREACH_DAILY_LIMIT — keep conservative.">
              <Input
                id="daily-limit"
                type="number"
                min={1}
                max={50}
                value={outreachDailyLimit}
                onChange={(e) => setOutreachDailyLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </FormField>
            <label className="flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-body-small text-foreground">
              <input type="checkbox" className="h-5 w-5 rounded border-border text-primary focus:ring-2 focus:ring-primary" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
              Keep this campaign in test mode (recommended until live credentials are configured)
            </label>
            <div className="rounded-xl border border-border bg-background p-4 text-body-small text-muted-foreground">
              Every outreach email requires manual admin approval before sending — this can&apos;t be changed yet.
            </div>
          </>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-background p-4 text-body-small">
              <p className="font-bold text-foreground">{name || "(untitled campaign)"}</p>
              <p className="mt-1 text-muted-foreground">{category} &bull; {[city, state, country].filter(Boolean).join(", ")}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-body-small text-muted-foreground">
              <p>Max businesses: <span className="font-semibold text-foreground">{maxBusinesses}</span></p>
              <p>Min reviews: <span className="font-semibold text-foreground">{minReviewCount || "None"}</span></p>
              <p>Keywords: <span className="font-semibold text-foreground">{keywords.length ? keywords.join(", ") : "None"}</span></p>
              <p>Competitors: <span className="font-semibold text-foreground">{competitorCount}</span></p>
              <p>Daily outreach limit: <span className="font-semibold text-foreground">{outreachDailyLimit}</span></p>
              <p>Test mode: <span className="font-semibold text-foreground">{testMode ? "On" : "Off"}</span></p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-body-small font-semibold text-amber-700">
              Discovery will use mock/seed data — Google Places and DataForSEO aren&apos;t connected yet, so businesses created here are for testing the pipeline, not real leads.
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        {step > 1 && (
          <Button variant="secondary" onClick={goBack} disabled={loading}>
            Back
          </Button>
        )}
        {step < 5 ? (
          <Button fullWidth onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Button fullWidth loading={loading} disabled={loading} onClick={handleStart}>
            Start Campaign
          </Button>
        )}
      </div>
    </div>
  );
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/campaigns");
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCampaigns();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchCampaigns]);

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
              <Link key={c.id} href={`/admin/campaigns/${c.id}`} className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-primary/40">
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
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create campaign wizard */}
      <CampaignWizard onCreated={fetchCampaigns} />
    </div>
  );
}
