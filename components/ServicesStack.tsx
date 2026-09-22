"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Eyebrow from "@/components/Eyebrow";
import ServiceIcon from "@/components/ServiceIcon";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { ButtonArrow, buttonClasses } from "@/components/ui/buttonStyles";
import { FEATURED_SERVICES, SERVICES } from "@/lib/services";

/**
 * Featured services as stacking cards: each card sticks just under the header
 * as you scroll and the next one slides up over it, the earlier cards easing
 * back (a touch smaller and dimmer) so the stack reads as depth. Pure CSS
 * sticky does the stacking; GSAP only drives the settle-back effect and is
 * skipped when motion is reduced.
 */
const TOP_OFFSET_REM = 6; // header (4.5rem) + breathing room
const STEP_REM = 1.25; // each later card sits a little lower so the stack shows

export default function ServicesStack() {
  const listRef = useRef<HTMLOListElement>(null);
  const remaining = SERVICES.length - FEATURED_SERVICES.length;

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-stack-card]"));
    const ctx = gsap.context(() => {
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        // As the next card travels up over this one, this one settles back
        gsap.fromTo(card, { scale: 1, filter: "brightness(1)" }, {
          scale: 0.94,
          filter: "brightness(0.94)",
          ease: "none",
          scrollTrigger: {
            trigger: next,
            start: `top bottom-=15%`,
            end: `top top+=${TOP_OFFSET_REM * 16 + (i + 1) * STEP_REM * 16}`,
            scrub: true,
          },
        });
      });
    }, list);
    return () => ctx.revert();
  }, []);

  return (
    <section id="featured-services" className="scroll-mt-[var(--header-height)] border-t border-border-subtle bg-background-alt">
      <div className="container-site section-space">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow className="justify-center">Featured services</Eyebrow>
          <h2 className="mt-4 text-heading-2 text-foreground">Four places a practice usually loses new patients.</h2>
          <p className="mt-4 text-body-large text-muted-foreground">Scroll through the services we start with most often — each one fixes a specific step in how a patient finds and books a dentist.</p>
        </div>

        <ol ref={listRef} className="mt-10 space-y-6 lg:mt-14 lg:space-y-8">
          {FEATURED_SERVICES.map((s, i) => (
            <li
              key={s.slug}
              className="lg:sticky"
              style={{ top: `${TOP_OFFSET_REM + i * STEP_REM}rem` }}
            >
              <article
                data-stack-card
                className="card-gradient group grid origin-top overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
              >
                <ServiceVisual variant={s.icon} size="mini" flush className="lg:hidden" />
                <div className="hidden lg:block">
                  <ServiceVisual variant={s.icon} className="h-full !aspect-auto rounded-none border-0" />
                </div>
                <div className="flex flex-col p-6 sm:p-8 lg:p-10">
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary-ink transition-[background-color,color] duration-[var(--duration-normal)] group-hover:bg-[image:var(--color-accent-gradient)] group-hover:text-white">
                      <ServiceIcon icon={s.icon} />
                    </span>
                    <span className="font-display text-[1.5rem] font-bold leading-none tracking-[-0.03em] text-text-faint">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-5 text-heading-3 text-foreground">{s.title}</h3>
                  <p className="mt-3 max-w-xl text-body text-muted-foreground">{s.summary}</p>
                  <p className="mt-3 max-w-xl text-body-small text-foreground">
                    <span className="font-medium">Benefit:</span> {s.benefit}
                  </p>
                  <div className="mt-auto pt-6">
                    <Link href={`/services/${s.slug}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                      <span>Explore service</span>
                      <ButtonArrow />
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-body-small text-muted-foreground">
          Plus {remaining} more — on-page and off-page SEO, content marketing and SEO audits.{" "}
          <Link href="/services" className="link-underline font-medium text-primary-ink">See all services</Link>.
        </p>
      </div>
    </section>
  );
}
