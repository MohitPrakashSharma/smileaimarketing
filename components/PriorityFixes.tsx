"use client";

import { RevealGroup, revealItem, motion } from "@/components/ui/Reveal";

const PRIORITIES = [
  {
    title: "Improve visibility for high-intent local searches",
    explanation:
      "Your practice appears outside the strongest positions for several searches patients use when looking for treatment nearby.",
  },
  {
    title: "Reduce friction in the mobile booking journey",
    explanation:
      "Patients currently need several steps before reaching a clear appointment action.",
  },
  {
    title: "Strengthen local profile signals",
    explanation:
      "Nearby practices currently have stronger review volume and local relevance signals.",
  },
];

export default function PriorityFixes() {
  return (
    <section id="priority-fixes" className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            SAMPLE PRIORITIES
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            What we would address first.
          </h2>
        </div>

        <div className="relative mx-auto mt-16 max-w-2xl">
          <div className="absolute top-2 bottom-2 left-6 w-px bg-border" aria-hidden="true" />
          <RevealGroup className="space-y-10" stagger={0.12}>
            {PRIORITIES.map((item, i) => (
              <motion.div key={item.title} variants={revealItem} className="relative flex gap-6">
                <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary font-body text-body font-bold text-primary-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="pt-1.5">
                  <h3 className="text-heading-3 font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-body-small text-muted-foreground leading-relaxed">{item.explanation}</p>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
