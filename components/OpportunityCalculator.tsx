"use client";

import Image from "next/image";
import Eyebrow from "@/components/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import OpportunityCalculatorCard from "@/components/opportunity/OpportunityCalculatorCard";

/**
 * "What could your website be costing you?" — a hypothetical-scenario
 * calculator. Inputs live only in component state: nothing is stored, sent to
 * analytics or attached to the audit. Results are estimates from the
 * visitor's own numbers, never a measured loss.
 */
export default function OpportunityCalculator() {
  return (
    <section id="opportunity" className="scroll-mt-[var(--header-height)] border-t border-border-subtle bg-background" aria-labelledby="opportunity-heading">
      <div className="container-site section-space">
        {/* Editorial header */}
        <div className="max-w-2xl">
          <Eyebrow>Missed opportunity</Eyebrow>
          <h2 id="opportunity-heading" className="mt-4 text-heading-1 text-foreground">What Could Your Website Be Costing You?</h2>
          <p className="mt-4 text-body-large text-muted-foreground">
            Your website may be attracting visitors without turning enough of them into enquiries. Explore what improving your conversion rate could mean for your practice.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
          {/* Photo column */}
          <Reveal className="relative min-w-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:aspect-[4/5]">
              <Image
                src="/images/reception-enquiry.jpg"
                alt="A patient talking to a receptionist holding a tablet at a clinic front desk"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
                quality={80}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(30,27,71,0.7)] to-transparent p-5 pt-16 text-white sm:p-6">
                <p className="text-eyebrow text-white/70">Where enquiries are won</p>
                <p className="mt-2 max-w-sm text-body-small text-white/90">
                  Every visitor who leaves without calling or booking is an enquiry your front desk never gets to convert.
                </p>
              </div>
            </div>
          </Reveal>

          {/* Calculator */}
          <Reveal delay={0.1} className="min-w-0">
            <OpportunityCalculatorCard
              primaryCta={{ label: "Find Out What's Holding Your Website Back", href: "/free-dental-audit" }}
              secondaryCta={{ label: "Book a Website Review", href: "/book-consultation" }}
              footnote="The free audit identifies verified problems on your website and listing. It doesn't prove that fixing them will produce the figures above — those depend on your numbers and on what you change."
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
