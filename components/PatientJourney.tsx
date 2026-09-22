"use client";

import Image from "next/image";
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
    <section id="patient-journey" className="scroll-mt-[var(--header-height)] bg-background-alt">
      <div className="container-site section-space">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
          <div className="flex max-w-xl flex-col">
            <Eyebrow>Why this matters</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">
              How patients actually choose a dentist.
            </h2>
            <p className="mt-4 text-body-large text-muted-foreground">
              Four steps, every time. Your free audit checks each one, because this is where practices quietly lose new patients.
            </p>
            {/* The end of the journey: a patient at the front desk, booking. */}
            <Reveal delay={0.15} className="relative mt-8 aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
              <Image
                src="/images/dental-reception-booking.jpg"
                alt="A receptionist showing an appointment calendar to a patient at a dental practice front desk"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
                quality={80}
              />
              <span className="absolute bottom-4 left-4 rounded-full bg-surface/90 px-3 py-1.5 text-metadata font-semibold text-foreground shadow-sm backdrop-blur">
                Step 04 · Calls or books
              </span>
            </Reveal>
            <Reveal delay={0.2} className="mt-6 hidden lg:block">
              <p className="text-body-small text-muted-foreground">
                Your free audit shows exactly where {`${TARGET_CITY}`}-area patients are dropping off in this journey today.
              </p>
            </Reveal>
          </div>

          {/* One step per row so the column fills the height of the copy + photo without empty cards. */}
          <RevealGroup className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1" stagger={0.1}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={revealItem}
                className="card-gradient group flex items-center gap-4 p-5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary-ink transition-[background-color,color] duration-[var(--duration-normal)] group-hover:bg-[image:var(--color-accent-gradient)] group-hover:text-white">
                  <step.Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-heading-4 text-foreground">{step.title}</h3>
                    <span className="font-display text-[1.5rem] font-bold leading-none tracking-[-0.03em] text-text-faint transition-colors duration-[var(--duration-normal)] group-hover:text-accent-gradient">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-1 text-body-small text-muted-foreground">{step.detail}</p>
                  {step.callout && (
                    <p className="badge-attention mt-2.5 inline-block rounded-[var(--radius-small)] border px-3 py-1 text-metadata font-semibold !text-[var(--color-status-attention-fg)]">
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
