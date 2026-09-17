"use client";

import { IconSearch, IconMapPin, IconMonitor, IconPhoneWave } from "@/components/icons";
import Eyebrow from "@/components/Eyebrow";
import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";
import { TARGET_CITY } from "@/lib/siteConfig";

const STEPS: { Icon: typeof IconSearch; title: string; detail: string; callout?: string }[] = [
  {
    Icon: IconSearch,
    title: "Searches nearby",
    detail: `A patient types "dentist near me" or "dentist in ${TARGET_CITY}."`,
  },
  {
    Icon: IconMapPin,
    title: "Compares a few options",
    detail: "They glance at the top few results on Google — ratings, reviews, distance.",
    callout: "Most patients only ever consider what they see first.",
  },
  {
    Icon: IconMonitor,
    title: "Checks the website",
    detail: "If a practice looks promising, they tap through to see if it feels trustworthy and easy to book with.",
    callout: "A slow or confusing site often ends the visit right here.",
  },
  {
    Icon: IconPhoneWave,
    title: "Calls or books",
    detail: "The patients who make it this far look for a phone number or booking button.",
    callout: "A hard-to-find number or booking step can cost the enquiry.",
  },
];

export default function PatientJourney() {
  return (
    <section id="patient-journey" className="bg-background-alt">
      <div className="container-site section-space">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
          <div className="max-w-xl">
            <Eyebrow>Why this matters</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">
              How patients actually choose a dentist.
            </h2>
            <p className="mt-4 text-body-large text-muted-foreground">
              Four steps, every time. Your free audit checks each one, because this is where practices quietly lose new patients.
            </p>
            <Reveal delay={0.2} className="mt-6 hidden lg:block">
              <p className="text-body-small text-muted-foreground">
                Your free audit shows exactly where {`${TARGET_CITY}`}-area patients are dropping off in this journey today.
              </p>
            </Reveal>
          </div>

          <RevealGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2" stagger={0.1}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={revealItem}
                className="card flex gap-4 p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                  <step.Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-heading-4 text-foreground">{step.title}</h3>
                    <span className="font-display text-[1.5rem] font-bold leading-none tracking-[-0.03em] text-border-strong">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-body-small text-muted-foreground">{step.detail}</p>
                  {step.callout && (
                    <p className="badge-attention mt-3 rounded-[var(--radius-small)] border px-3 py-1.5 text-metadata font-semibold !text-[var(--color-status-attention-fg)]">
                      {step.callout}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </RevealGroup>

          <Reveal delay={0.2} className="lg:hidden">
            <p className="text-body-small text-muted-foreground">
              Your free audit shows exactly where {`${TARGET_CITY}`}-area patients are dropping off in this journey today.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
