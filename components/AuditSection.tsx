"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
      setWebsiteError("Please enter your practice website.");
      isValid = false;
    } else {
      const domainPattern = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      const urlPattern = /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/.*)?$/;
      if (!domainPattern.test(trimmedWeb) && !urlPattern.test(trimmedWeb)) {
        setWebsiteError("Please enter a valid website address, e.g. yourpractice.ca");
        isValid = false;
      } else {
        setWebsiteError("");
      }
    }

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setCityError("Please enter the city your practice is in.");
      isValid = false;
    } else if (trimmedCity.length < 2) {
      setCityError("Please enter a valid city name.");
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
    <section id="seo-audit" className="relative scroll-mt-[var(--header-height)] overflow-hidden border-y border-border-subtle">
      {/* Backdrop: a dental close-up washed almost to white, with the prism gradient (pink top edge → white) over it */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/images/audit-backdrop-dental-model.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[70%_center]"
          quality={70}
        />
        <div className="absolute inset-0 band-prism-wash" />
      </div>

      <div className="container-site section-space relative">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <Reveal>
            <Eyebrow>Free website audit</Eyebrow>
            <h2 className="mt-4 text-heading-1 text-foreground">
              See how your website and local visibility perform.
            </h2>
            <p className="mt-4 max-w-lg text-body-large text-muted-foreground">
              Enter your practice website and city. We&apos;ll check how patients find you online and show you what to fix first — in plain English, with no logins required.
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <form
              onSubmit={handleSubmit}
              className="rounded-[var(--radius-large)] border border-white/70 bg-white/65 p-5 shadow-xl backdrop-blur-xl sm:p-6 space-y-4 [-webkit-backdrop-filter:blur(24px)]"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                <FormField id="hero-website" label="Practice website" required optionalLabel={false} error={websiteError}>
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
                    placeholder="yourpractice.ca"
                    hasError={!!websiteError}
                    aria-describedby={websiteError ? "hero-website-error" : "hero-website-hint"}
                  />
                </FormField>

                <FormField id="hero-city" label="Practice city" required optionalLabel={false} error={cityError}>
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
                    placeholder="We'll detect this from your website"
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

              <div className="pt-0.5">
                <Button type="submit" loading={isSubmitting} fullWidth arrow>
                  {isSubmitting ? "Preparing your audit..." : "Get Your Free Website Audit"}
                </Button>
              </div>

              <p className="border-t border-border pt-4 text-metadata">
                <span className="font-semibold text-foreground">What happens next:</span> you&apos;ll see a preview of early findings right away. Enter your email to receive the full report, then decide whether you&apos;d like a 15-minute walkthrough with our team.
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
