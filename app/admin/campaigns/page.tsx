"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ProgressSteps from "@/components/ui/ProgressSteps";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { EmptyState } from "@/components/admin/EmptyState";

type Campaign = {
  id: string;
  name: string;
  city: string;
  category: string;
  status: string;
  dataProvider?: string;
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
        setStep1Error("Campaign title must be at least 3 characters.");
        return;
      }
      if (!city.trim()) {
        setStep1Error("Target city is required.");
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
          dataProvider: testMode ? "TEST_PROVIDER" : "DATAFORSEO",
          outreachDailyLimit,
          testMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

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
    <div className="h-fit rounded-xl border border-border bg-surface p-5 shadow-xs">
      <h2 className="text-sm font-bold text-foreground">New Outbound Campaign</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Target market, lead criteria, audit scope, and daily limits.
      </p>

      <div className="mt-4">
        <ProgressSteps steps={STEP_LABELS} current={step} />
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-danger/20 bg-danger/10 p-3 text-center text-xs font-bold text-danger">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3.5">
        {step === 1 && (
          <>
            <FormField id="campaign-name" label="Campaign Title" required optionalLabel={false} error={step1Error && !name.trim() ? step1Error : undefined}>
              <Input
                id="campaign-name"
                type="text"
                required
                placeholder="e.g. Denver Metro Dental Outreach"
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
                <Input id="campaign-state" type="text" placeholder="e.g. CO" value={state} onChange={(e) => setState(e.target.value)} />
              </FormField>
            </div>
            <FormField id="campaign-city" label="Target City" required optionalLabel={false} error={step1Error && !city.trim() ? step1Error : undefined}>
              <Input
                id="campaign-city"
                type="text"
                required
                placeholder="e.g. Denver"
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
            <FormField id="max-businesses" label="Maximum Businesses" optionalLabel={false}>
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
            <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-xs">
              <label className="flex items-center gap-2.5 text-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" checked={websiteRequired} onChange={(e) => setWebsiteRequired(e.target.checked)} />
                Require website to qualify
              </label>
              <label className="flex items-center gap-2.5 text-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" checked={excludeChains} onChange={(e) => setExcludeChains(e.target.checked)} />
                Exclude large dental chains
              </label>
              <label className="flex items-center gap-2.5 text-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" checked={excludeExistingContacts} onChange={(e) => setExcludeExistingContacts(e.target.checked)} />
                Exclude existing contacts
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <FormField id="keywords" label="Keywords" hint="Comma-separated">
              <Input id="keywords" type="text" placeholder="dentist, teeth whitening" value={keywordsInput} onChange={(e) => setKeywordsInput(e.target.value)} />
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
          </>
        )}

        {step === 4 && (
          <>
            <FormField id="daily-limit" label="Outreach Daily Limit" optionalLabel={false}>
              <Input
                id="daily-limit"
                type="number"
                min={1}
                max={50}
                value={outreachDailyLimit}
                onChange={(e) => setOutreachDailyLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </FormField>
            <label className="flex items-center gap-2.5 rounded-xl border border-border bg-background p-3 text-xs text-foreground">
              <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
              Keep campaign in test mode
            </label>
            <p className="text-metadata leading-relaxed text-muted-foreground">
              {testMode
                ? "Test mode uses safe, made-up sample businesses — nothing real is discovered or contacted. Uncheck to pull real practices from DataForSEO."
                : "Live mode will discover real practices via DataForSEO using your configured API credentials."}
            </p>
          </>
        )}

        {step === 5 && (
          <div className="space-y-2.5 text-xs">
            <div className="rounded-xl border border-border bg-background p-3">
              <p className="font-bold text-foreground">{name || "(untitled campaign)"}</p>
              <p className="mt-0.5 text-muted-foreground">{category} &bull; {[city, state, country].filter(Boolean).join(", ")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-3 text-muted-foreground">
              <p>Max businesses: <span className="font-bold text-foreground">{maxBusinesses}</span></p>
              <p>Daily limit: <span className="font-bold text-foreground">{outreachDailyLimit}</span></p>
              <p>Data source: <span className="font-bold text-foreground">{testMode ? "Sample (test)" : "Live (DataForSEO)"}</span></p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2.5">
        {step > 1 && (
          <Button variant="secondary" onClick={goBack} disabled={loading} className="!h-9">
            Back
          </Button>
        )}
        {step < 5 ? (
          <Button fullWidth onClick={goNext} className="!h-9">
            Continue
          </Button>
        ) : (
          <Button fullWidth loading={loading} disabled={loading} onClick={handleStart} className="!h-9">
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

  const renderPrimaryAction = (c: Campaign) => {
    if (c.status === "DRAFT") {
      return (
        <Link
          href={`/admin/campaigns/${c.id}`}
          className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary-hover"
        >
          Start Campaign
        </Link>
      );
    }
    if (c.status === "FAILED") {
      return (
        <Link
          href={`/admin/campaigns/${c.id}`}
          className="inline-flex h-8 items-center rounded-lg bg-rose-500/10 px-3 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
        >
          Retry
        </Link>
      );
    }
    if (c.status === "COMPLETED") {
      return (
        <Link
          href={`/admin/campaigns/${c.id}`}
          className="inline-flex h-8 items-center rounded-lg bg-emerald-500/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
        >
          View Results
        </Link>
      );
    }
    return (
      <Link
        href={`/admin/campaigns/${c.id}`}
        className="inline-flex h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/20"
      >
        View Progress
      </Link>
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[62%_38%]">
      {/* Campaigns list */}
      <div className="space-y-4">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-foreground sm:text-[32px]">Campaigns</h1>
          <p className="text-body-small text-muted-foreground">Manage active practice discovery and outreach campaigns.</p>
        </div>

        {campaigns.length === 0 ? (
          <EmptyState title="No campaigns yet" message="Create your first campaign to initiate business discovery." />
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => {
              const found = c._count?.businesses || 0;
              const audited = c.businesses?.filter((b) => b.status === "AUDITED" || b.status === "CONVERTED").length || 0;
              const converted = c.businesses?.filter((b) => b.status === "CONVERTED").length || 0;

              return (
                <div key={c.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/admin/campaigns/${c.id}`} className="truncate font-bold text-foreground text-sm hover:text-primary block">
                        {c.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-semibold text-primary">{c.category}</span> &bull; {c.city}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-background p-2.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Leads Found</span>
                      <span className="block font-extrabold text-foreground mt-0.5">{found}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Audited</span>
                      <span className="block font-extrabold text-foreground mt-0.5">{audited}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Converted</span>
                      <span className="block font-extrabold text-emerald-400 mt-0.5">{converted}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-2">
                    {renderPrimaryAction(c)}
                    <ActionMenu
                      items={[
                        { label: "Open Command Centre", onClick: () => (window.location.href = `/admin/campaigns/${c.id}`) },
                        { label: "View Discovered Leads", onClick: () => (window.location.href = `/admin/businesses?campaign=${c.id}`) },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create campaign wizard */}
      <CampaignWizard onCreated={fetchCampaigns} />
    </div>
  );
}
