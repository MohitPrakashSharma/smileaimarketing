"use client";

import { IconCheck, IconCalendarCheck, IconMapPin } from "@/components/icons";

const TRUST_POINTS = [
  "No login required, ever",
  "Told what to fix first, not just what's wrong",
  "Any estimate is clearly marked as one",
];

const CONSULTATION_OPTIONS = [
  {
    Icon: IconCalendarCheck,
    title: "15-minute online review",
    description: "We'll sit down together, walk through what we found, and figure out what's actually worth fixing first.",
    ctaText: "Book Online Review",
    ctaHref: "/book-consultation",
  },
  {
    Icon: IconMapPin,
    title: "Request a clinic visit",
    description: "We'll come to your practice and walk your team through it in person, where we're able to.",
    ctaText: "Request a Visit",
    ctaHref: "/book-consultation?type=in-person",
  },
];

export default function TrustAndConsultation() {
  return (
    <section id="trust-consultation" className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          {/* Trust points */}
          <div className="rounded-2xl border border-border bg-surface-muted/30 p-6 sm:p-8">
            <h2 className="text-heading-2 font-semibold text-foreground">Clear findings. Human review.</h2>
            <p className="mt-3 text-body-small text-muted-foreground leading-relaxed">
              No inflated promises, no generic score pulled out of nowhere — just real findings based on what&apos;s actually visible online today.
            </p>
            <ul className="mt-6 space-y-3">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-body-small font-medium text-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Consultation options */}
          <div>
            <h2 className="text-heading-2 font-semibold text-foreground">Review your results your way.</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {CONSULTATION_OPTIONS.map((opt) => (
                <div
                  key={opt.title}
                  className="flex flex-col justify-between rounded-2xl border border-border bg-background p-6 shadow-sm"
                >
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-primary">
                      <opt.Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-5 text-body font-semibold text-foreground">{opt.title}</h3>
                    <p className="mt-2 text-body-small text-muted-foreground leading-relaxed">
                      {opt.description}
                    </p>
                  </div>
                  <a
                    href={opt.ctaHref}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-6 font-body text-body-small font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {opt.ctaText}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
