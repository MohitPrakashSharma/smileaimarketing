"use client";

import Image from "next/image";
import { IconStar, IconSearch, IconMonitor, IconPhoneWave } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";
import { ButtonArrow } from "@/components/ui/buttonStyles";
import { Reveal } from "@/components/ui/Reveal";
import { ILLUSTRATIVE_INPUTS, computeOpportunity } from "@/lib/opportunityCalculator";
// Missed-opportunity preview: the same clearly illustrative scenario the
// calculator further down can load — sample numbers, never a real practice.
const SCENARIO = computeOpportunity({
  monthlyVisitors: Number(ILLUSTRATIVE_INPUTS.monthlyVisitors),
  currentRate: Number(ILLUSTRATIVE_INPUTS.currentRate),
  targetRate: Number(ILLUSTRATIVE_INPUTS.targetRate),
  patientRate: Number(ILLUSTRATIVE_INPUTS.patientRate),
  contribution: Number(ILLUSTRATIVE_INPUTS.contribution),
});
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 });

const PREVIEW_ROWS: { Icon: typeof IconSearch; label: string; value: string }[] = [
  { Icon: IconSearch, label: "Enquiry rate", value: `${ILLUSTRATIVE_INPUTS.currentRate}% → ${ILLUSTRATIVE_INPUTS.targetRate}%` },
  { Icon: IconPhoneWave, label: "Extra enquiries / month", value: num.format(SCENARIO.additionalEnquiries) },
  { Icon: IconStar, label: "Extra patients / month", value: num.format(SCENARIO.additionalPatients) },
  { Icon: IconMonitor, label: "Per day", value: cad.format(SCENARIO.dailyContribution) },
];

export default function Hero() {
  return (
    <section id="top" className="relative overflow-hidden bg-background">
      <div className="container-site grid items-center gap-14 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:pt-16 lg:pb-20">

        {/* Left column: editorial headline and CTAs */}
        <div className="max-w-2xl self-center">
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
          </Reveal>
        </div>

        {/* Right column: practice photo with a layered report preview */}
        <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
          <Reveal delay={0.15}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted sm:aspect-[5/4]">
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

          {/* Missed-opportunity preview — illustrative scenario, links to the calculator */}
          <Reveal
            delay={0.35}
            className="card-elevated relative mt-4 w-full overflow-hidden sm:absolute sm:-bottom-6 sm:-left-8 sm:mt-0 sm:w-80"
          >
            <div className="band-dark flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Find how much money you are losing</p>
                <p className="mt-0.5 font-display text-[1rem] font-semibold text-foreground">Illustrative scenario</p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block font-display text-[1.375rem] font-bold leading-none tracking-[-0.03em] text-accent-gradient">{cad.format(SCENARIO.monthlyContribution)}</span>
                <span className="font-copy text-[0.8125rem] font-normal text-muted-foreground">per month</span>
              </span>
            </div>
            <ul className="divide-y divide-border-subtle bg-surface px-4">
              {PREVIEW_ROWS.map((row) => (
                <li key={row.label} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                    <row.Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-[0.875rem] font-semibold text-foreground">{row.label}</span>
                    <span className="shrink-0 text-[0.875rem] font-semibold text-muted-foreground">{row.value}</span>
                  </div>
                </li>
              ))}
            </ul>
            <a href="#opportunity" className="flex items-center justify-between gap-2 border-t border-border-subtle bg-background-alt px-4 py-2.5 text-[0.875rem] font-semibold text-primary-ink transition-colors hover:text-foreground">
              <span>Sample numbers — run yours</span>
              <ButtonArrow className="h-3.5 w-3.5" />
            </a>
          </Reveal>

          {/* What the audit checks, in the patient's order */}
          <Reveal
            delay={0.5}
            className="card-elevated absolute -right-3 top-8 w-44 p-4 sm:-right-8 sm:w-48"
          >
            <p className="text-eyebrow text-muted-foreground">Checked publicly</p>
            <p className="mt-1.5 text-body-small font-medium text-foreground">No logins. Just what a patient sees when they search.</p>
          </Reveal>
        </div>

      </div>
    </section>
  );
}
