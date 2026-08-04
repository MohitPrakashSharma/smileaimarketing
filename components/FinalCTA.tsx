"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function FinalCTA() {
  const router = useRouter();
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [cityError, setCityError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    let isValid = true;
    const trimmedWebsite = website.trim();
    if (!trimmedWebsite) {
      setWebsiteError("Website is required");
      isValid = false;
    } else {
      setWebsiteError("");
    }

    const trimmedCity = city.trim();
    if (!trimmedCity) {
      setCityError("City is required");
      isValid = false;
    } else {
      setCityError("");
    }

    if (!isValid) return;

    setIsSubmitting(true);
    let normalizedWebsite = trimmedWebsite.toLowerCase();
    if (!/^https?:\/\//i.test(normalizedWebsite)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }

    const params = new URLSearchParams({ website: normalizedWebsite, city: trimmedCity });
    router.push(`/free-dental-audit?${params.toString()}`);
  };

  return (
    <section id="contact" className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-sm sm:py-14">
          <h2 className="text-heading-1 font-semibold text-foreground">
            See what your practice should fix first.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-body text-muted-foreground">
            Start with your website and city. We will prepare a clear local growth review.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="final-cta-website" label="Practice Website" required optionalLabel={false} error={websiteError}>
                <Input
                  id="final-cta-website"
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
                />
              </FormField>
              <FormField id="final-cta-city" label="City" required optionalLabel={false} error={cityError}>
                <Input
                  id="final-cta-city"
                  type="text"
                  required
                  disabled={isSubmitting}
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Chicago"
                  hasError={!!cityError}
                />
              </FormField>
            </div>
            <Button type="submit" loading={isSubmitting} fullWidth>
              {isSubmitting ? "Starting scan..." : "Audit My Practice"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
