"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconSearch, IconMonitor, IconUsers, IconStar } from "@/components/icons";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Eyebrow from "@/components/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { trackEvent } from "@/lib/analytics.client";
import { useSiteDetect, describeDetection } from "@/lib/siteDetect.client";

/**
 * The homepage's one audit entry point. The form, its ids, validation,
 * detection hook, tracking and routing moved here verbatim from Hero.tsx —
 * only the surrounding section is new.
 */

// What the review covers — same list the process section already promises.
const EVALUATES: { Icon: typeof IconSearch; label: string }[] = [
  { Icon: IconSearch, label: "Local search visibility" },
  { Icon: IconUsers, label: "Competitors" },
  { Icon: IconStar, label: "Reputation" },
  { Icon: IconMonitor, label: "Website and booking experience" },
];

export default function AuditSection() {
  const router = useRouter();

  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");

  const [websiteError, setWebsiteError] = useState("");
  const [cityError, setCityError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasStartedForm = useRef(false);

  // City auto-fills from the website lookup unless the visitor has typed
  // their own — a manual entry always wins over a detected one.
  const cityTouched = useRef(false);
  const { status: detectStatus, result: detected, detect } = useSiteDetect((site) => {
    if (site.city && !cityTouched.current) {
      setCity([site.city, site.state].filter(Boolean).join(", "));
      setCityError("");
    }
  });

  const handleFormStart = () => {
    if (hasStartedForm.current) return;
    hasStartedForm.current = true;
    trackEvent("audit_form_start", { form_location: "hero" });
  };

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

    trackEvent("audit_form_submit", { form_location: "hero" });
    setIsSubmitting(true);

    let normalizedWebsite = website.trim().toLowerCase();
    if (!/^https?:\/\//i.test(normalizedWebsite)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }

    const params = new URLSearchParams({
      website: normalizedWebsite,
      city: city.trim(),
    });
    if (detected?.name) params.set("name", detected.name);
    if (detected?.country) params.set("country", detected.country);
    if (detected?.industry?.key) params.set("industry", detected.industry.key);

    router.push(`/free-dental-audit?${params.toString()}`);
  };

  return (
    <section id="seo-audit" className="band-dark scroll-mt-[var(--header-height)]">
      <div className="container-site section-space">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:gap-16">
          <Reveal>
            <Eyebrow tone="dark">Free practice audit</Eyebrow>
            <h2 className="mt-5 text-heading-1 text-foreground">
              Run My Free Dental Audit
            </h2>
            <p className="mt-6 max-w-lg text-body-large text-muted-foreground">
              Paste your website — we&apos;ll find your location and handle the rest.
            </p>
            <p className="mt-8 text-eyebrow text-muted-foreground">What we review</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {EVALUATES.map((item) => (
                <li key={item.label} className="flex items-center gap-3 text-body-small text-foreground-secondary">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary-ink">
                    <item.Icon className="h-4 w-4" />
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1}>
            <form
              onSubmit={handleSubmit}
              className="band-light rounded-[var(--radius-large)] p-6 shadow-xl sm:p-8 space-y-5"
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
                    onChange={(e) => {
                      handleFormStart();
                      setWebsite(e.target.value);
                      if (websiteError) setWebsiteError("");
                      detect(e.target.value);
                    }}
                    onPaste={(e) => detect(e.clipboardData.getData("text"), { immediate: true })}
                    onBlur={(e) => detect(e.target.value, { immediate: true })}
                    placeholder="clinic.com"
                    hasError={!!websiteError}
                    aria-describedby={websiteError ? "hero-website-error" : "hero-website-hint"}
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
                    onChange={(e) => {
                      handleFormStart();
                      cityTouched.current = e.target.value.trim().length > 0;
                      setCity(e.target.value);
                      if (cityError) setCityError("");
                    }}
                    placeholder="Detected from your website"
                    hasError={!!cityError}
                    aria-describedby={cityError ? "hero-city-error" : undefined}
                  />
                </FormField>
              </div>

              {detectStatus !== "idle" && (
                <p
                  id="hero-website-hint"
                  aria-live="polite"
                  className={`-mt-1 flex items-center gap-2 text-metadata ${detectStatus === "found" ? "!text-success" : ""}`}
                >
                  {detectStatus === "loading" && (
                    <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden />
                  )}
                  {describeDetection(detectStatus, detected)}
                </p>
              )}

              <div className="pt-1">
                <Button type="submit" loading={isSubmitting} fullWidth arrow>
                  {isSubmitting ? "Preparing your audit..." : "Get My Free Practice Audit"}
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-metadata">
                {["No Google account access required", "No obligation"].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <IconCheck className="h-3.5 w-3.5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
