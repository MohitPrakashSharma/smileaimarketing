"use client";

import Image from "next/image";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";
import ApproachTimeline from "@/components/about/ApproachTimeline";
import EvidenceTrack from "@/components/about/EvidenceTrack";
import { CAPTION_WASH } from "@/components/about/captionWash";
import WhatYouGet from "@/components/about/WhatYouGet";
import { TARGET_REGION } from "@/lib/siteConfig";

/**
 * About page body. Same visual language as the homepage — photography in
 * rounded frames with floating cards, gradient cards that glow on hover
 * (`card-gradient`), the light prism band, and scroll-triggered reveals — so
 * the page reads as part of the same site rather than a text-only annex.
 * Photos are licensed stock (see docs/image-credits.md); the copy never
 * presents the people in them as our staff or clients.
 */

/**
 * Who we help. Each card is a photograph with the text laid over it; the
 * images are licensed stock of real dental environments (see
 * docs/image-credits.md) and the copy never presents the people in them as
 * our staff or clients.
 */
const WHO_WE_HELP = [
  {
    title: "Dental clinics",
    detail: "Single-location practices that want more of the right patients finding them online.",
    image: "/images/dental-operatory-bright.jpg",
    alt: "A modern, welcoming dental practice interior",
  },
  {
    title: "Practice owners",
    detail: "Owners who need a clear, prioritised view of what their website and listings are doing for them.",
    image: "/images/about-team-tablet.jpg",
    alt: "Two dental team members showing a patient something on a tablet",
  },
  {
    title: "Dentists",
    detail: "Clinicians who want plain-English answers, not marketing jargon or vanity metrics.",
    image: "/images/dental-xray-review.jpg",
    alt: "A dentist reviewing a dental x-ray on a screen",
  },
  {
    title: "Practice managers",
    detail: "The people who field the enquiries and know where the patient journey breaks down.",
    image: "/images/dental-reception-booking.jpg",
    alt: "A receptionist showing a calendar to a patient at the front desk",
  },
  {
    title: "Growing dental groups",
    detail: "Multi-location groups that need consistency across every practice's web presence.",
    image: "/images/dental-operatory-calm.jpg",
    alt: "A quiet, empty dental treatment room",
  },
];

const APPROACH = [
  { title: "Understand the practice", detail: "Your services, the patients you want more of, and where enquiries come from today." },
  { title: "Audit what is happening now", detail: "We crawl your website, run technical and content checks, and pull Google's PageSpeed data for the pages that matter." },
  { title: "Prioritise the biggest opportunities", detail: "Findings are ranked by severity, how many pages they affect and the effort to fix — so you know what to do first." },
  { title: "Improve and measure", detail: "Fix what matters most, then re-check the same data to see what actually changed." },
];

export default function AboutContent() {
  return (
    <main className="flex-1 bg-background">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border-subtle bg-background-alt">
        <div className="container-site section-space">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
            <div className="max-w-2xl">
              <Reveal>
                <Eyebrow>About Smile AI Marketing</Eyebrow>
              </Reveal>
              <Reveal delay={0.06}>
                <h1 className="mt-5 text-heading-1 text-foreground">
                  Marketing Built Around <span className="text-accent-gradient">the Way Dental Practices Grow</span>
                </h1>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-5 max-w-xl text-body-large text-muted-foreground">
                  Smile AI Marketing{" "}
                  <span className="text-marker font-medium text-foreground">
                    helps Canadian dental practices improve how they are found
                  </span>
                  , understood and chosen online. We combine website strategy, local search visibility, performance
                  insights and practical marketing recommendations to help practices build a stronger digital presence.
                </p>
              </Reveal>
            </div>

            <div className="relative">
              <Reveal delay={0.15}>
                <div className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted sm:aspect-[5/4]">
                  <Image
                    src="/images/about-hero.jpg"
                    alt="A dentist talking with a smiling patient in a dental chair"
                    fill
                    priority
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none"
                    quality={82}
                  />
                  <div className="absolute inset-0 bg-background-dark/10" aria-hidden />
                </div>
              </Reveal>
              <Reveal delay={0.3} className="card-elevated relative mt-4 w-full p-5 sm:absolute sm:-bottom-6 sm:-left-8 sm:mt-0 sm:w-72">
                <p className="text-eyebrow text-muted-foreground">What you get</p>
                <WhatYouGet className="mt-4" />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who we help: photo cards, text laid over the image ── */}
      <section className="container-site section-space">
        {/* Heading and standfirst side by side, so the intro reads across the
            width instead of stacking into a tall column. */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-14">
          <Reveal className="max-w-xl">
            <Eyebrow>Who we help</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">Dental practices, and the people who run them.</h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:max-w-[32rem]">
            <p className="text-body text-muted-foreground">
              We work only with dentistry. That focus means the checks we run, the language we use and the fixes we
              recommend are built around how a patient actually chooses a dentist — not borrowed from a generic agency
              playbook.
            </p>
          </Reveal>
        </div>

        {/* Six columns: three cards across the first row, two wider ones across the second. */}
        <RevealGroup className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-6" stagger={0.08}>
          {WHO_WE_HELP.map((item, i) => (
            <motion.article
              key={item.title}
              variants={revealItem}
              className={`group relative min-h-[17rem] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted lg:min-h-[19rem] ${
                i < 3 ? "lg:col-span-2" : "lg:col-span-3"
              } ${i === WHO_WE_HELP.length - 1 ? "sm:col-span-2 lg:col-span-3" : ""}`}
            >
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.04] motion-reduce:transition-none"
                quality={80}
              />
              {/* A shallow wash: enough for the text to sit on, little enough that the room still reads. */}
              <div className={`${CAPTION_WASH} p-5 pt-16 sm:p-6 sm:pt-20`}>
                <h3 className="text-heading-4 text-white">{item.title}</h3>
                <p className="mt-2 max-w-sm text-body-small text-white/90">{item.detail}</p>
              </div>
              {/* Last in the card so it paints above the photo and the wash.
                  Positioned by the wrapper, not the button: `buttonClasses`
                  already sets `relative`, and Tailwind emits `.relative` after
                  `.absolute`, so an override on the link itself loses.

                  The label repeats on every card, so each one names its own
                  card to a screen reader rather than reading as five identical
                  "Book a consultation" links. */}
              <div className="absolute right-4 top-4 z-10">
                <Link
                  href="/book-consultation"
                  aria-label={`Book a consultation — ${item.title}`}
                  className={buttonClasses({ variant: "light", size: "sm", className: "shadow-md" })}
                >
                  <span>Book a consultation</span>
                  <ButtonArrow />
                </Link>
              </div>
            </motion.article>
          ))}
        </RevealGroup>
      </section>

      {/* ── Our approach: vertical timeline with a scroll-following marker ── */}
      <ApproachTimeline
        steps={APPROACH}
        eyebrow="Our approach"
        heading="Simple, in the right order."
        intro="No audit is worth much if it hands you fifty things to fix and no order to fix them in. We follow the same four steps with every practice."
      />

      {/* ── Evidence before assumptions: pinned horizontal track ── */}
      <EvidenceTrack />

      {/* ── Canadian dental focus ── */}
      <section className="container-site section-space">
        <Reveal>
          {/* Grid stack: the spacer holds the banner's proportions, the content
              sits in the same cell. The row takes whichever is taller, so the
              buttons can never be cut off the way an absolute overlay would. */}
          <div className="group relative grid overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
            <div className="absolute inset-0">
              <Image
                src="/images/about-clinic-wide.jpg"
                alt="Two dentists reviewing a dental x-ray on a screen in a bright clinic"
                fill
                sizes="(min-width: 1280px) 80vw, 100vw"
                className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none"
                quality={80}
              />
              {/* Lighter than a flat scrim, with the stops placed so the text
                  column still clears AA: the darkest part covers the copy and
                  the photo opens up to the right. */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(30,53,96,0.80) 0%, rgba(30,53,96,0.55) 48%, rgba(30,53,96,0) 88%)",
                }}
                aria-hidden
              />
            </div>
            <div className="col-start-1 row-start-1 aspect-[4/3] sm:aspect-[16/9] lg:aspect-[20/9]" aria-hidden />
            {/* `relative`: the image layer above is positioned, so static content would paint underneath it. */}
            <div className="relative col-start-1 row-start-1 flex items-center">
              <div className="max-w-xl p-6 text-white sm:p-10 lg:p-14">
                <Eyebrow className="!text-white/85">Canadian dental focus</Eyebrow>
                <h2 className="mt-4 text-heading-2 text-white">Built for practices in Canada.</h2>
                {/* Solid white, not a tint: the lighter gradient only clears AA
                    at the end of a line if the text is at full strength. */}
                <p className="mt-4 text-body text-white">
                  Built around Canadian dental practices — how patients search for a dentist nearby, and what a clinic&apos;s website has to do well.
                </p>
                <p className="mt-3 text-body-small text-white">
                  Across Canada, starting in {TARGET_REGION}. The audit runs on your public website and listings — nothing to install, no account access.
                </p>
                {/* The page's closing actions live here rather than in a separate band below. */}
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/free-dental-audit" className={buttonClasses({ variant: "light", className: "whitespace-nowrap" })}>
                    <span>Get Your Free Website Audit</span>
                    <ButtonArrow />
                  </Link>
                  <Link
                    href="/book-consultation"
                    className={buttonClasses({ variant: "secondary", className: "whitespace-nowrap !border-white/60 !text-white hover:!border-primary hover:!text-primary-foreground" })}
                  >
                    Book a Consultation
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
