"use client";

import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";

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
    <section id="how-it-works" className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            THE PROCESS
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Your practice checkup in four simple steps.
          </h2>
        </div>

        <div className="relative mt-16">
          <motion.div
            className="absolute inset-x-6 top-6 hidden h-px origin-left bg-border lg:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          />
          <div className="absolute top-6 bottom-6 left-6 w-px bg-border lg:hidden" aria-hidden="true" />

          <RevealGroup className="relative grid grid-cols-1 gap-10 lg:grid-cols-4 lg:gap-6" stagger={0.12}>
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={revealItem}
                className="relative flex items-start gap-4 lg:flex-col lg:items-center lg:gap-3 lg:text-center"
              >
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-body text-body-small font-bold text-primary-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-body font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-body-small text-muted-foreground">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>

        <Reveal delay={0.2} className="mx-auto mt-14 max-w-lg text-center">
          <p className="text-body-small text-muted-foreground">
            No jargon, no long forms — just a clear look at what&apos;s affecting new patient calls.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
