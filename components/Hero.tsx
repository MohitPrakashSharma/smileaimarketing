"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconMapPin, IconMonitor, IconStar, IconTrendingUp } from "@/components/icons";

export default function Hero() {
  const router = useRouter();

  // Form states
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [clinicName, setClinicName] = useState("");

  // Validation & Submission states
  const [websiteError, setWebsiteError] = useState("");
  const [cityError, setCityError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateInputs = () => {
    let isValid = true;
    
    // Website validation
    const trimmedWeb = website.trim();
    if (!trimmedWeb) {
      setWebsiteError("Website is required");
      isValid = false;
    } else {
      // Basic domain check
      const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      const urlPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      if (!domainPattern.test(trimmedWeb) && !urlPattern.test(trimmedWeb)) {
        setWebsiteError("Please enter a valid clinic website (e.g., dentalclinic.com)");
        isValid = false;
      } else {
        setWebsiteError("");
      }
    }

    // City validation
    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setCityError("City is required");
      isValid = false;
    } else if (trimmedCity.length < 2) {
      setCityError("Please enter a valid city name");
      isValid = false;
    } else {
      setCityError("");
    }

    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateInputs()) return;

    setIsSubmitting(true);

    // Normalize URL
    let normalizedWebsite = website.trim().toLowerCase();
    if (!/^https?:\/\//i.test(normalizedWebsite)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }

    // Redirect to wizard page with query parameters
    const params = new URLSearchParams({
      website: normalizedWebsite,
      city: city.trim(),
    });
    if (clinicName.trim()) {
      params.append("clinicName", clinicName.trim());
    }

    router.push(`/free-dental-audit?${params.toString()}`);
  };

  const handleScrollToSample = () => {
    const sampleSection = document.getElementById("sample-audit");
    if (sampleSection) {
      sampleSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="top" className="relative bg-background pt-10 pb-16 sm:pt-16 sm:pb-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 sm:px-8 lg:grid-cols-[52%_48%] lg:gap-8">
        
        {/* Left Column: Headline and Form */}
        <div>
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            LOCAL GROWTH AUDIT FOR DENTAL CLINICS
          </span>
          <h1 className="mt-5 font-sans text-display text-foreground">
            See where nearby dental clinics are winning — and what to fix first.
          </h1>
          <p className="mt-6 text-body-large text-muted-foreground max-w-xl">
            Review your clinic’s local visibility, website experience, reviews, and competitive gaps in one clear audit.
          </p>

          {/* Primary Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-4 max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-md"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Clinic Website Field */}
              <div className="flex flex-col">
                <label htmlFor="hero-website" className="text-body-small font-semibold text-foreground mb-1">
                  Clinic Website <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="hero-website"
                    type="url"
                    required
                    disabled={isSubmitting}
                    autoComplete="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="clinic.com"
                    className={`w-full h-12 rounded-lg border px-3 text-body bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      websiteError ? "border-rose-400" : "border-border"
                    }`}
                  />
                </div>
                {websiteError && <span className="text-metadata text-rose-600 mt-1">{websiteError}</span>}
              </div>

              {/* City Field */}
              <div className="flex flex-col">
                <label htmlFor="hero-city" className="text-body-small font-semibold text-foreground mb-1">
                  City <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="hero-city"
                    type="text"
                    required
                    disabled={isSubmitting}
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Chicago"
                    className={`w-full h-12 rounded-lg border px-3 text-body bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      cityError ? "border-rose-400" : "border-border"
                    }`}
                  />
                </div>
                {cityError && <span className="text-metadata text-rose-600 mt-1">{cityError}</span>}
              </div>
            </div>

            {/* Optional Clinic Name Field */}
            <div className="flex flex-col">
              <label htmlFor="hero-clinic" className="text-body-small font-semibold text-foreground mb-1">
                Clinic Name <span className="text-metadata text-muted-foreground font-normal">(Optional)</span>
              </label>
              <input
                id="hero-clinic"
                type="text"
                disabled={isSubmitting}
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Metro Dental Care"
                className="w-full h-12 rounded-lg border border-border px-3 text-body bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-full bg-primary font-body text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60 flex items-center justify-center"
              >
                {isSubmitting ? "Initiating Free Scan..." : "Audit My Clinic"}
              </button>
              <button
                type="button"
                onClick={handleScrollToSample}
                className="h-12 rounded-full border border-border bg-surface px-6 font-body text-base font-semibold text-foreground transition-colors hover:bg-surface-muted flex items-center justify-center"
              >
                View Sample Audit
              </button>
            </div>
          </form>

          {/* Trust Microcopy */}
          <ul className="mt-6 space-y-2 text-metadata text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>No Google account access required.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Based on publicly available business signals.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Clear recommendations, not generic scores.</span>
            </li>
          </ul>
        </div>

        {/* Right Column: Realistic Product Preview Mockup */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-border bg-background px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-2 font-mono text-xs text-muted-foreground">audit-preview-tool</span>
            </div>
            <span className="rounded bg-accent-soft px-2 py-0.5 font-label text-[10px] tracking-wider text-primary">
              Sample audit preview
            </span>
          </div>

          {/* Mock Dashboard Contents */}
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4 gap-2">
              <div>
                <p className="text-body font-bold text-foreground">Metro Dental Care</p>
                <p className="text-metadata">Chicago Market Simulator</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-metadata font-semibold text-muted-foreground uppercase">Opportunity</span>
                <span className="rounded bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                  HIGH
                </span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-4">
              {/* Metric 1 */}
              <div className="flex items-center justify-between bg-background p-3.5 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary">
                    <IconMapPin className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-body-small font-semibold text-foreground">Local Visibility</p>
                    <p className="text-metadata">Map-pack ranking indicator</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body font-bold text-rose-600">42/100</p>
                  <p className="text-metadata text-rose-600 font-semibold uppercase">Poor</p>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="flex items-center justify-between bg-background p-3.5 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary">
                    <IconMonitor className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-body-small font-semibold text-foreground">Website Experience</p>
                    <p className="text-metadata">Mobile speed & layout test</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body font-bold text-amber-600">61/100</p>
                  <p className="text-metadata text-amber-600 font-semibold uppercase">Average</p>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="flex items-center justify-between bg-background p-3.5 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary">
                    <IconStar className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-body-small font-semibold text-foreground">Review Position</p>
                    <p className="text-metadata">Local map ranking slot</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body font-bold text-rose-600">7th</p>
                  <p className="text-metadata text-rose-600 font-semibold uppercase">Buried</p>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="flex items-center justify-between bg-background p-3.5 rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary">
                    <IconTrendingUp className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-body-small font-semibold text-foreground">Competitors Ahead</p>
                    <p className="text-metadata">Higher-ranked local clinics</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-body font-bold text-rose-600">3</p>
                  <p className="text-metadata text-rose-600 font-semibold uppercase">High Gap</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
