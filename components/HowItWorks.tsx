"use client";

import { useState } from "react";
import Image from "next/image";
import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";
import Eyebrow from "@/components/Eyebrow";

/** Each step is a flip card: a photo on the front, the explanation on the back. */
const STEPS = [
  {
    title: "Enter your website and city",
    detail: "That's all we need. No passwords, no Google account access, nothing to install.",
    image: "/images/step-enter-website.jpg",
    alt: "A receptionist in scrubs reading a tablet at a clinic front desk",
  },
  {
    title: "We review how patients find you",
    detail: "Local search visibility, nearby competitors, reviews, and your website and booking experience.",
    image: "/images/step-patient-search.jpg",
    alt: "A person holding a smartphone and searching a map for a nearby location",
  },
  {
    title: "Get your Practice Growth Review",
    detail: "A plain-English report: what's working, where the opportunities are, and what to fix first. Sent to your email so you can come back to it.",
    image: "/images/step-growth-review.jpg",
    alt: "A dentist seated in a treatment room reading a printed report",
  },
  {
    title: "Review the findings",
    detail: "If you'd like, book a 15-minute call or an in-person visit and we'll walk through the findings with you. No pitch, no obligation.",
    image: "/images/step-review-findings.jpg",
    alt: "A dentist and a patient reviewing images together on a screen",
  },
];

function StepCard({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  // Hover/focus flips on pointer devices (CSS); a tap toggles it everywhere else.
  const [flipped, setFlipped] = useState(false);
  const number = String(index + 1).padStart(2, "0");
  return (
    <motion.div variants={revealItem}>
      <button
        type="button"
        aria-expanded={flipped}
        aria-label={`Step ${number}: ${step.title}. ${flipped ? "Hide" : "Show"} details`}
        onClick={() => setFlipped((f) => !f)}
        className="group block w-full rounded-[var(--radius-xl)] text-left [perspective:1400px] focus:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(59,103,178,0.45)]"
      >
        <div
          className={`relative aspect-[5/4] w-full transition-transform sm:aspect-[4/5] duration-700 ease-[var(--ease-out)] [transform-style:preserve-3d] motion-reduce:transition-none ${
            flipped ? "[transform:rotateY(180deg)]" : "group-hover:[transform:rotateY(180deg)] group-focus-visible:[transform:rotateY(180deg)]"
          }`}
        >
          {/* Front: photo */}
          <div className="flip-face absolute inset-0 overflow-hidden rounded-[var(--radius-xl)] border border-black/5 bg-surface-muted shadow-[0_24px_50px_-28px_rgba(30,53,96,0.35)]">
            <Image
              src={step.image}
              alt={step.alt}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:transition-none"
              quality={80}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[rgba(30,53,96,0.92)] via-[rgba(30,53,96,0.45)] to-transparent" aria-hidden />
            <span className="absolute left-4 top-4 inline-flex h-10 min-w-10 items-center justify-center rounded-full bg-white/90 px-3 font-display text-[0.9375rem] font-semibold text-foreground shadow-sm backdrop-blur">
              {number}
            </span>
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="text-heading-4 text-white">{step.title}</h3>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-white/85">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 8a5.5 5.5 0 0 1 9.4-3.9M13.5 8a5.5 5.5 0 0 1-9.4 3.9" />
                  <path d="M12 1.5v3h-3M4 14.5v-3h3" />
                </svg>
                Details
              </span>
            </div>
          </div>

          {/* Back: explanation on the brand gradient */}
          <div className="flip-face absolute inset-0 flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-border-subtle bg-white/90 p-5 shadow-[0_24px_50px_-28px_rgba(30,53,96,0.35)] backdrop-blur [transform:rotateY(180deg)] band-prism-card">
            <span className="font-display text-[2rem] font-bold leading-none tracking-[-0.03em] text-accent-gradient">{number}</span>
            <h3 className="mt-4 text-heading-4 text-foreground">{step.title}</h3>
            <p className="mt-3 text-body-small text-muted-foreground">{step.detail}</p>
            <span className="mt-auto pt-4 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {index + 1} of {STEPS.length}</span>
          </div>
        </div>
      </button>
    </motion.div>
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="band-prism relative scroll-mt-[var(--header-height)] overflow-hidden border-y border-border-subtle">
      <div className="relative container-site section-space">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>The process</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">
              From your website to a plan in four steps.
            </h2>
          </div>
          <Reveal delay={0.2} className="max-w-md">
            <p className="text-body-small text-muted-foreground">
              No jargon and no long forms — just a clear picture of what&apos;s affecting new patient enquiries. Hover or tap a step for details.
            </p>
          </Reveal>
        </div>

        <RevealGroup className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" stagger={0.12}>
          {STEPS.map((step, i) => (
            <StepCard key={step.title} step={step} index={i} />
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
