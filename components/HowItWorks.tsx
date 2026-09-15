"use client";

import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";
import Eyebrow from "@/components/Eyebrow";

const STEPS = [
  {
    title: "Tell us about your practice",
    detail: "Website and city. No passwords or Google account access.",
  },
  {
    title: "We review your local market",
    detail: "Local search visibility, competitors, reputation, website and booking experience.",
  },
  {
    title: "Receive your Practice Growth Review",
    detail: "What's working, where opportunities exist, and what deserves attention first.",
  },
  {
    title: "Review the findings",
    detail: "Optionally go through them with a specialist, in plain English.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="band-dark scroll-mt-[var(--header-height)]">
      <div className="container-site section-space">
        <div className="max-w-2xl">
          <Eyebrow tone="dark">The process</Eyebrow>
          <h2 className="mt-5 text-heading-2 text-foreground">
            Your practice checkup in four simple steps.
          </h2>
        </div>

        <div className="relative mt-14">
          <motion.div
            className="absolute inset-x-0 top-6 hidden h-px origin-left bg-border lg:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          />
          <div className="absolute top-6 bottom-6 left-6 w-px bg-border lg:hidden" aria-hidden="true" />

          <RevealGroup className="relative grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-8" stagger={0.12}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={revealItem}
                className="relative flex items-start gap-5 lg:flex-col lg:gap-6"
              >
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-display text-[0.9375rem] font-semibold text-foreground ring-4 ring-[var(--color-bg-dark)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="pt-2 lg:pt-0">
                  <h3 className="text-heading-4 text-foreground">{step.title}</h3>
                  <p className="mt-2 text-body-small text-muted-foreground">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>

        <Reveal delay={0.2} className="mt-14 max-w-lg">
          <p className="text-body-small text-muted-foreground">
            No jargon, no long forms — just a clear look at what&apos;s affecting new patient calls.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
