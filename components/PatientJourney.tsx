"use client";

import { IconSearch, IconMapPin, IconStar, IconPhoneWave, IconCheck } from "@/components/icons";
import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";

const STEPS = [
  { key: "SEARCH", title: "Search", desc: "A patient searches for a dentist nearby.", Icon: IconSearch },
  { key: "DISCOVER", title: "Discover", desc: "Your practice needs to appear.", Icon: IconMapPin },
  { key: "COMPARE", title: "Compare", desc: "They compare reviews, services and websites.", Icon: IconStar },
  { key: "BOOK", title: "Book", desc: "They call, request an appointment, or book online.", Icon: IconPhoneWave },
  { key: "FOLLOW-UP", title: "Follow-up", desc: "Interest becomes a booked patient.", Icon: IconCheck },
];

export default function PatientJourney() {
  return (
    <section id="patient-journey" className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            THE PATIENT JOURNEY
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            A patient can be lost at any step.
          </h2>
        </div>

        <div className="relative mt-16">
          {/* Desktop connecting line */}
          <motion.div
            className="absolute inset-x-6 top-6 hidden h-px origin-left bg-border sm:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            aria-hidden="true"
          />
          {/* Mobile connecting line */}
          <div className="absolute top-6 bottom-6 left-6 w-px bg-border sm:hidden" aria-hidden="true" />

          <RevealGroup className="relative grid grid-cols-1 gap-10 sm:grid-cols-5 sm:gap-4" stagger={0.12}>
            {STEPS.map((step) => (
              <motion.div
                key={step.key}
                variants={revealItem}
                className="relative flex items-start gap-4 sm:flex-col sm:items-center sm:gap-3 sm:text-center"
              >
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-white text-primary">
                  <step.Icon className="h-5 w-5" />
                </span>
                <div className="sm:px-1">
                  <p className="font-label text-xs tracking-wider text-primary">{step.key}</p>
                  <h3 className="mt-1 text-body font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-body-small text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>

        <Reveal delay={0.2} className="mx-auto mt-14 max-w-xl text-center">
          <p className="text-body text-muted-foreground">
            Our checkup identifies where this journey has unnecessary friction — and what to fix first.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
