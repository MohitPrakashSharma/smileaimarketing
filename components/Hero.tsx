"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch, IconStar, IconMonitor, IconUsers, IconTrendingUp } from "@/components/icons";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import StatusBadge, { type StatusLevel } from "@/components/ui/StatusBadge";
import { Reveal, RevealGroup, revealItem, AnimatedCounter, motion } from "@/components/ui/Reveal";

const DASHBOARD_METRICS: { Icon: typeof IconSearch; label: string; score: number; status: StatusLevel }[] = [
  { Icon: IconSearch, label: "Patient Discovery", score: 42, status: "attention" },
  { Icon: IconStar, label: "Patient Trust", score: 78, status: "healthy" },
  { Icon: IconMonitor, label: "Website Experience", score: 61, status: "opportunity" },
];

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
    <section id="top" className="relative overflow-hidden bg-background pt-10 pb-16 sm:pt-16 sm:pb-24">
      {/* Ambient depth — brand-teal glow, decorative only */}
      <div className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-[110px]" aria-hidden />
      <div className="pointer-events-none absolute -bottom-32 left-0 h-[360px] w-[360px] rounded-full bg-accent-soft blur-[110px]" aria-hidden />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 px-6 sm:px-8 lg:grid-cols-[50%_50%] lg:gap-10">

        {/* Left Column: Headline and Form */}
        <div>
          <Reveal>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-label text-xs tracking-wider text-muted-foreground">
                <span aria-hidden>🍁</span> BUILT FOR CANADIAN DENTAL PRACTICES
              </span>
              <span className="inline-block rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
                A FREE GROWTH CHECKUP
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-5 font-sans text-display text-foreground">
              See where your dental practice is missing new patient opportunities.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-xl text-body-large text-muted-foreground">
              A clear review of your Google visibility, website and local competition — with the priorities worth fixing first.
            </p>
          </Reveal>

          {/* Primary Form */}
          <Reveal delay={0.18}>
            <form
              onSubmit={handleSubmit}
              className="mt-8 max-w-xl space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-md"
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

                <FormField id="hero-city" label="Practice Location / City" required optionalLabel={false} error={cityError}>
                  <Input
                    id="hero-city"
                    type="text"
                    required
                    disabled={isSubmitting}
                    autoComplete="address-level2"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Toronto"
                    hasError={!!cityError}
                    aria-describedby={cityError ? "hero-city-error" : undefined}
                  />
                </FormField>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <Button type="submit" loading={isSubmitting} fullWidth className="sm:flex-1">
                  {isSubmitting ? "Preparing your audit..." : "Get My Free Practice Audit"}
                </Button>
                <Button type="button" variant="secondary" onClick={handleScrollToSample}>
                  View Sample Audit
                </Button>
              </div>
            </form>
          </Reveal>

          {/* Trust Microcopy */}
          <Reveal delay={0.24}>
            <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-2 text-metadata text-muted-foreground sm:grid-cols-2">
              {[
                "No Google account access required",
                "Based on real local search and website signals",
                "Clear findings, explained in plain English",
                "No obligation",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Right Column: Practice Growth Checkup dashboard */}
        <Reveal delay={0.15}>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-xl">
            {/* Header Bar */}
            <div className="flex items-center justify-between border-b border-border bg-background px-5 py-3.5">
              <div>
                <p className="text-body-small font-bold text-foreground">Metro Dental Care</p>
                <p className="text-metadata">Toronto, ON</p>
              </div>
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-label text-[10px] tracking-wider text-muted-foreground">
                Sample data
              </span>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <p className="font-label text-xs tracking-wider text-primary">PRACTICE GROWTH CHECKUP</p>

              {/* Score metrics */}
              <RevealGroup className="space-y-3" stagger={0.1}>
                {DASHBOARD_METRICS.map((m) => (
                  <motion.div
                    key={m.label}
                    variants={revealItem}
                    className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                        <m.Icon className="h-4.5 w-4.5" />
                      </span>
                      <p className="text-body-small font-semibold text-foreground">{m.label}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-body font-bold text-foreground">
                        <AnimatedCounter value={m.score} suffix=" / 100" />
                      </p>
                      <StatusBadge status={m.status} />
                    </div>
                  </motion.div>
                ))}

                {/* Competitive position - qualitative */}
                <motion.div
                  variants={revealItem}
                  className="flex items-center justify-between rounded-xl border border-border bg-background p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                      <IconUsers className="h-4.5 w-4.5" />
                    </span>
                    <p className="text-body-small font-semibold text-foreground">Competitive Position</p>
                  </div>
                  <p className="text-body-small font-semibold text-muted-foreground">3 practices ahead</p>
                </motion.div>
              </RevealGroup>

              {/* Top opportunity callout */}
              <Reveal delay={0.35} className="rounded-xl border border-border bg-surface-muted/60 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <IconTrendingUp className="h-4 w-4" />
                  <p className="font-label text-xs tracking-wider">TOP OPPORTUNITY</p>
                </div>
                <p className="mt-2 text-body-small font-semibold text-foreground">
                  &ldquo;Emergency Dentist Toronto&rdquo;
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-metadata text-muted-foreground">
                  <span>Current position: <strong className="text-foreground">#11</strong></span>
                  <span>Search demand: <strong className="text-foreground">High</strong></span>
                </div>
              </Reveal>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
