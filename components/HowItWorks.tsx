"use client";

import { IconTarget, IconTrendingUp, IconCalendarCheck } from "@/components/icons";

const STEPS = [
  { Icon: IconTarget, title: "Enter your website and city" },
  { Icon: IconTrendingUp, title: "Review the clearest gaps" },
  { Icon: IconCalendarCheck, title: "Discuss what to fix first" },
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
            How it works.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            A focused audit built around the decisions that affect patient enquiries.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                <step.Icon className="h-6 w-6" />
              </span>
              <div>
                <span className="font-label text-xs font-semibold text-primary">
                  STEP {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-1 text-body font-semibold text-foreground">{step.title}</h3>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
