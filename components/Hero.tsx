"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconMapPin, IconMonitor, IconStar, IconTrendingUp } from "@/components/icons";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function Hero() {
  const router = useRouter();

  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");

  const [websiteError, setWebsiteError] = useState("");
  const [cityError, setCityError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateInputs = () => {
    let isValid = true;

    const trimmedWeb = website.trim();
    if (!trimmedWeb) {
      setWebsiteError("Website is required");
      isValid = false;
    } else {
      const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      const urlPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      if (!domainPattern.test(trimmedWeb) && !urlPattern.test(trimmedWeb)) {
        setWebsiteError("Please enter a valid practice website (e.g., dentalclinic.com)");
        isValid = false;
      } else {
        setWebsiteError("");
      }
    }

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

    let normalizedWebsite = website.trim().toLowerCase();
    if (!/^https?:\/\//i.test(normalizedWebsite)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }

    const params = new URLSearchParams({
      website: normalizedWebsite,
      city: city.trim(),
    });

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
          <span className="animate-fade-in-up inline-block rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            LOCAL GROWTH AUDIT FOR DENTAL PRACTICES
          </span>
          <h1
            className="animate-fade-in-up mt-5 font-sans text-display text-foreground"
            style={{ animationDelay: "80ms" }}
          >
            See why nearby dentists get found first.
          </h1>
          <p
            className="animate-fade-in-up mt-6 max-w-xl text-body-large text-muted-foreground"
            style={{ animationDelay: "140ms" }}
          >
            We review your Google visibility, website, reviews, and booking experience — then show you what to fix first.
          </p>

          {/* Primary Form */}
          <form
            onSubmit={handleSubmit}
            className="animate-fade-in-up mt-8 max-w-xl space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-md"
            style={{ animationDelay: "200ms" }}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="hero-website" label="Practice Website" required optionalLabel={false} error={websiteError}>
                <Input
                  id="hero-website"
                  type="url"
                  required
                  disabled={isSubmitting}
                  autoComplete="url"
                  autoCapitalize="none"
                  autoCorrect="off"
                  inputMode="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="clinic.com"
                  hasError={!!websiteError}
                  aria-describedby={websiteError ? "hero-website-error" : undefined}
                />
              </FormField>

              <FormField id="hero-city" label="City" required optionalLabel={false} error={cityError}>
                <Input
                  id="hero-city"
                  type="text"
                  required
                  disabled={isSubmitting}
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Chicago"
                  hasError={!!cityError}
                  aria-describedby={cityError ? "hero-city-error" : undefined}
                />
              </FormField>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button type="submit" loading={isSubmitting} fullWidth className="sm:flex-1">
                {isSubmitting ? "Starting scan..." : "Audit My Practice"}
              </Button>
              <Button type="button" variant="secondary" onClick={handleScrollToSample}>
                View Sample Audit
              </Button>
            </div>
          </form>

          {/* Trust Microcopy */}
          <ul
            className="animate-fade-in-up mt-6 space-y-2 text-metadata text-muted-foreground"
            style={{ animationDelay: "260ms" }}
          >
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>No Google account access required.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Based on public business signals.</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>Clear, practical recommendations.</span>
            </li>
          </ul>
        </div>

        {/* Right Column: Realistic Product Preview Mockup */}
        <div
          className="animate-fade-in-up relative overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
          style={{ animationDelay: "160ms" }}
        >
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
          <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-body font-bold text-foreground">Metro Dental Care</p>
                <p className="text-metadata">Chicago Market Simulator</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-metadata font-semibold uppercase text-muted-foreground">Opportunity</span>
                <span className="rounded bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                  HIGH
                </span>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-4">
              {[
                { Icon: IconMapPin, label: "Local Visibility", caption: "Map-pack ranking indicator", value: "42/100", status: "Poor", tone: "text-rose-600" },
                { Icon: IconMonitor, label: "Website Experience", caption: "Mobile speed & layout test", value: "61/100", status: "Average", tone: "text-amber-600" },
                { Icon: IconStar, label: "Review Position", caption: "Local map ranking slot", value: "7th", status: "Buried", tone: "text-rose-600" },
                { Icon: IconTrendingUp, label: "Competitors Ahead", caption: "Higher-ranked local practices", value: "3", status: "High Gap", tone: "text-rose-600" },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-primary">
                      <m.Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-body-small font-semibold text-foreground">{m.label}</p>
                      <p className="text-metadata">{m.caption}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-body font-bold ${m.tone}`}>{m.value}</p>
                    <p className={`text-metadata font-semibold uppercase ${m.tone}`}>{m.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
