"use client";

import Image from "next/image";
import { IconStar, IconUsers, IconTrendingUp, IconSearch, IconMonitor, IconPhoneWave } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal, AnimatedCounter } from "@/components/ui/Reveal";
import { TARGET_CITY, TARGET_PROVINCE } from "@/lib/siteConfig";

const TRUST_STATS: { Icon: typeof IconUsers; value: string; label: string }[] = [
  { Icon: IconUsers, value: "100+", label: "Dental Practices Helped" },
  { Icon: IconTrendingUp, value: "2–5X", label: "More Qualified Leads" },
  { Icon: IconStar, value: "5-Star", label: "Client Rated" },
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
              <span aria-hidden>🍁</span> Built for dental practices in {TARGET_CITY}, {TARGET_PROVINCE}
            </span>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-5 text-display-lg text-foreground">
              See where your dental practice is missing{" "}
              <span className="text-accent-gradient whitespace-nowrap">new patient</span> opportunities.
            </h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-5 max-w-lg text-body-large text-muted-foreground">
              A clear review of what&apos;s costing you new patients — and what to fix first.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href="#seo-audit" arrow>
                Get My Free Practice Audit
              </ButtonLink>
              <ButtonLink href="#sample-audit" variant="secondary">
                View Sample Audit
              </ButtonLink>
            </div>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-metadata">
              {["No Google account access required", "No obligation"].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Trust stats */}
          <Reveal delay={0.24}>
            <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6 sm:gap-6">
              {TRUST_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-bold tracking-[-0.02em] text-foreground">
                    {stat.value === "100+" ? <AnimatedCounter value={100} suffix="+" /> : stat.value}
                  </dd>
                  <dd className="mt-1 flex items-start gap-1.5 text-metadata" aria-hidden>
                    <stat.Icon className="mt-0.5 hidden h-3.5 w-3.5 shrink-0 text-primary sm:block" />
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>
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

          {/* Result cards */}
          <Reveal
            delay={0.5}
            className="card-elevated absolute -right-3 top-8 w-40 p-4 sm:-right-8 sm:w-44"
          >
            <p className="text-metadata">Appointments Booked</p>
            <p className="mt-1 font-display text-[1.625rem] font-bold tracking-[-0.02em] text-primary-ink">
              <AnimatedCounter value={120} prefix="+" suffix="%" />
            </p>
          </Reveal>

          <Reveal
            delay={0.6}
            className="card-elevated absolute -right-3 top-[42%] w-40 p-4 sm:-right-8 sm:w-44"
          >
            <p className="text-metadata">New Patients</p>
            <p className="mt-1 font-display text-[1.625rem] font-bold tracking-[-0.02em] text-foreground">
              <AnimatedCounter value={150} prefix="+" suffix="%" />
            </p>
          </Reveal>

          <Reveal
            delay={0.7}
            className="card-elevated absolute -left-3 top-10 w-28 p-4 sm:-left-8"
          >
            <p className="text-metadata">ROI</p>
            <p className="mt-1 font-display text-[1.625rem] font-bold tracking-[-0.02em] text-foreground">2.7x</p>
          </Reveal>
        </div>

      </div>
    </section>
  );
}
