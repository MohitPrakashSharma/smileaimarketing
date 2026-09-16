"use client";

import Image from "next/image";
import { IconCheck, IconCalendarCheck, IconMapPin } from "@/components/icons";
import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import Eyebrow from "@/components/Eyebrow";

const TRUST_POINTS = [
  "No login required, ever",
  "Told what to fix first, not just what's wrong",
  "Any estimate is clearly marked as one",
];

const CONSULTATION_OPTIONS = [
  {
    Icon: IconCalendarCheck,
    title: "15-minute online review",
    description: "We'll sit down together, walk through what we found, and figure out what's actually worth fixing first.",
    ctaText: "Book Online Review",
    ctaHref: "/book-consultation",
  },
  {
    Icon: IconMapPin,
    title: "Request a clinic visit",
    description: "We'll come to your practice and walk your team through it in person, where we're able to.",
    ctaText: "Request a Visit",
    ctaHref: "/book-consultation?type=in-person",
  },
];

export default function TrustAndConsultation() {
  return (
    <section id="trust-consultation" className="scroll-mt-[var(--header-height)] bg-background-alt">
      <div className="container-site section-space">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
          {/* Trust points */}
          <Reveal className="card overflow-hidden !border-border-subtle bg-surface">
            <div className="relative h-44 w-full sm:h-48">
              <Image
                src="/images/dental-operatory-calm.jpg"
                alt="A modern dental treatment room — the kind of practice this review is built for"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
                quality={75}
              />
            </div>
            <div className="p-6">
              <h2 className="text-heading-3 text-foreground">Clear findings. Human review.</h2>
              <p className="mt-3 text-body-small text-muted-foreground">
                Data helps identify the opportunity. A conversation helps determine what actually makes sense for your practice.
              </p>
              <ul className="mt-5 space-y-2.5">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-body-small font-medium text-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Consultation options */}
          <div className="flex flex-col">
            <Eyebrow>Consultation</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">Review your results your way.</h2>
            <RevealGroup className="mt-6 grid gap-4 sm:grid-cols-2" stagger={0.1}>
              {CONSULTATION_OPTIONS.map((opt) => (
                <motion.div
                  key={opt.title}
                  variants={revealItem}
                  className="card flex flex-col p-6"
                >
                  <div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                      <opt.Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-heading-4 text-foreground">{opt.title}</h3>
                    <p className="mt-2 text-body-small text-muted-foreground">
                      {opt.description}
                    </p>
                  </div>
                  <ButtonLink href={opt.ctaHref} variant="secondary" size="sm" arrow className="mt-5 w-fit">
                    {opt.ctaText}
                  </ButtonLink>
                </motion.div>
              ))}
            </RevealGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
