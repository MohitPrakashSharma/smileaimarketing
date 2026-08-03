"use client";

import { IconTarget, IconTrendingUp, IconCalendarCheck } from "@/components/icons";

const STEPS = [
  {
    Icon: IconTarget,
    title: "Enter your clinic and city",
    copy: "Provide your public website URL and primary search location to start the automated visibility scan.",
  },
  {
    Icon: IconTrendingUp,
    title: "We analyze public signals",
    copy: "Our algorithms test your Google Maps placement, directory consistency, and mobile performance.",
  },
  {
    Icon: IconCalendarCheck,
    title: "Review with a specialist",
    copy: "Access your report online or schedule a brief remote screen share to walk through your local gaps.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            THE PROCESS
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Three steps to reveal local growth gaps.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            We extract public search engine information and prepare your prioritized action plan in minutes.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                  <step.Icon className="h-6 w-6" />
                </span>
                <span className="font-label text-xs font-semibold text-primary">
                  STEP {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-heading-3 font-semibold text-foreground">{step.title}</h3>
              <p className="mt-3 text-body-small text-muted-foreground leading-relaxed">
                {step.copy}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
