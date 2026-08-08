"use client";

import { IconSearch, IconMonitor, IconChat, IconGrid, IconCheck, IconCalendarCheck } from "@/components/icons";
import { RevealGroup, revealItem, motion } from "@/components/ui/Reveal";

const STEPS = [
  { Icon: IconSearch, label: "Google / Local Search" },
  { Icon: IconMonitor, label: "Practice Website" },
  { Icon: IconChat, label: "New Patient Enquiry" },
  { Icon: IconGrid, label: "Follow-up Pipeline" },
  { Icon: IconCheck, label: "Qualified" },
  { Icon: IconCalendarCheck, label: "Booked Patient" },
];

function Arrow() {
  return (
    <span className="flex shrink-0 items-center justify-center px-1 text-muted-foreground" aria-hidden="true">
      <span className="lg:hidden">↓</span>
      <span className="hidden lg:inline">→</span>
    </span>
  );
}

export default function VisibilityPipeline() {
  return (
    <section id="visibility-pipeline" className="theme-navy border-t border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-white/10 px-3 py-1 font-label text-xs tracking-wider text-white">
            BEYOND THE AUDIT
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Getting discovered is only part of the patient journey.
          </h2>
        </div>

        <RevealGroup
          className="mx-auto mt-14 flex max-w-4xl flex-col items-center gap-2 lg:flex-row lg:justify-between lg:gap-1"
          stagger={0.08}
        >
          {STEPS.map((step, i) => (
            <div key={step.label} className="flex flex-col items-center gap-2 lg:flex-row">
              <motion.div variants={revealItem} className="flex flex-col items-center gap-2.5 text-center">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-primary">
                  <step.Icon className="h-6 w-6" />
                </span>
                <p className="max-w-[6.5rem] text-body-small font-medium text-foreground">{step.label}</p>
              </motion.div>
              {i < STEPS.length - 1 && (
                <motion.div variants={revealItem}>
                  <Arrow />
                </motion.div>
              )}
            </div>
          ))}
        </RevealGroup>

        <div className="mx-auto mt-14 max-w-xl text-center">
          <p className="text-body text-muted-foreground">
            We can also help practices organize patient enquiries into a simple follow-up pipeline, so calls, forms and opportunities are easier to manage.
          </p>
        </div>
      </div>
    </section>
  );
}
