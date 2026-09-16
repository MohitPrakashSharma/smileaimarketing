"use client";

import Image from "next/image";
import { IconStar, IconCheck, IconSearch, IconMonitor, IconPhoneWave, IconClock } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
// Facts a practice owner can verify on this site — not performance claims.
const TRUST_POINTS: { Icon: typeof IconCheck; title: string; detail: string }[] = [
  { Icon: IconCheck, title: "Dental-only", detail: "We only work with dental practices." },
  { Icon: IconSearch, title: "Evidence first", detail: "Your free audit uses public data, not promises." },
  { Icon: IconClock, title: "About 2 minutes", detail: "From website to a plain-English report." },
];

// Product-style preview built from our own report UI — same categories and
// sample figures as the "Sample audit preview" section further down.
const PREVIEW_ROWS: { Icon: typeof IconSearch; label: string; score: number; tone: "attention" | "healthy" | "opportunity" }[] = [
  { Icon: IconSearch, label: "Patient Discovery", score: 42, tone: "attention" },
  { Icon: IconStar, label: "Patient Trust", score: 78, tone: "healthy" },
  { Icon: IconMonitor, label: "Website Experience", score: 61, tone: "opportunity" },
  { Icon: IconPhoneWave, label: "Booking Journey", score: 54, tone: "opportunity" },
];

const TONE_BAR: Record<string, string> = {
  healthy: "var(--color-status-healthy-fg)",
  opportunity: "var(--color-status-opportunity-fg)",
  attention: "var(--color-status-attention-fg)",
};

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-background">
      <div className="container-site grid items-center gap-14 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:pt-16 lg:pb-20">

        {/* Left column: editorial headline and CTAs */}
        <div className="max-w-2xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 text-eyebrow text-primary-ink">
              <span aria-hidden>🍁</span> Dental marketing for Canadian practices
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-5 text-display-lg text-foreground">
              Grow your dental practice with{" "}
              <span className="text-accent-gradient">smarter digital marketing.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-xl text-body-large text-muted-foreground">
              We help Canadian dental clinics get found in local search, attract more qualified patient enquiries, and turn their websites into a dependable source of new patients. It starts with a free audit of your website and local visibility.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="#seo-audit" arrow>
                Get Your Free Website Audit
              </ButtonLink>
              <ButtonLink href="/book-consultation" variant="secondary">
                Book a Consultation
              </ButtonLink>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-metadata">
              {["No Google account access needed", "No obligation", "Takes about 2 minutes"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Why practices can trust the process — verifiable, not performance claims */}
          <Reveal delay={0.24}>
            <ul className="mt-10 grid gap-5 border-t border-border pt-6 sm:grid-cols-3 sm:gap-6">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="flex items-start gap-3 sm:block">
                  <point.Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary sm:mb-2" />
                  <div>
                    <p className="font-display text-[1.0625rem] font-semibold text-foreground">{point.title}</p>
                    <p className="mt-0.5 text-metadata">{point.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Right column: practice photo with a layered report preview */}
        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <Reveal delay={0.15}>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted sm:aspect-[5/6]">
              <Image
                src="/images/dental-operatory-bright.jpg"
                alt="A modern, welcoming dental practice interior"
                fill
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-cover"
                quality={80}
                priority
              />
              <div className="absolute inset-0 bg-background-dark/15" aria-hidden />
            </div>
          </Reveal>

          {/* Report preview card — our own audit UI, sample data */}
          <Reveal
            delay={0.35}
            className="card-elevated relative mt-4 w-full overflow-hidden sm:absolute sm:-bottom-6 sm:-left-8 sm:mt-0 sm:w-80"
          >
            <div className="band-dark flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Practice Growth Review</p>
                <p className="mt-0.5 font-display text-[0.9375rem] font-semibold text-foreground">Sample scorecard</p>
              </div>
              <span className="font-display text-[1.5rem] font-bold leading-none tracking-[-0.03em] text-foreground">
                59<span className="font-body text-[0.6875rem] font-normal tracking-normal text-muted-foreground">/100</span>
              </span>
            </div>
            <ul className="divide-y divide-border-subtle bg-surface px-4">
              {PREVIEW_ROWS.map((row) => (
                <li key={row.label} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                    <row.Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[0.8125rem] font-semibold text-foreground">{row.label}</span>
                      <span className="text-[0.75rem] font-semibold text-muted-foreground">{row.score}</span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full" style={{ width: `${row.score}%`, backgroundColor: TONE_BAR[row.tone] }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* What the audit checks, in the patient's order */}
          <Reveal
            delay={0.5}
            className="card-elevated absolute -right-3 top-8 w-44 p-4 sm:-right-8 sm:w-48"
          >
            <p className="text-eyebrow !text-[0.6875rem] text-muted-foreground">Checked publicly</p>
            <p className="mt-1.5 text-body-small font-semibold text-foreground">No logins. Just what a patient sees when they search.</p>
          </Reveal>
        </div>

      </div>
    </section>
  );
}
