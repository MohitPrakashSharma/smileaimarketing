"use client";

import Image from "next/image";
import Eyebrow from "@/components/Eyebrow";
import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";
import FocusCarousel from "@/components/about/FocusCarousel";
import ApproachTimeline from "@/components/about/ApproachTimeline";
import { IconMapPin, IconMonitor, IconSearch, IconTrendingUp, IconCheck } from "@/components/icons";
import { TARGET_CITY, TARGET_PROVINCE } from "@/lib/siteConfig";

/**
 * About page body. Same visual language as the homepage — photography in
 * rounded frames with floating cards, gradient cards that glow on hover
 * (`card-gradient`), the light prism band, and scroll-triggered reveals — so
 * the page reads as part of the same site rather than a text-only annex.
 * Photos are licensed stock (see docs/image-credits.md); the copy never
 * presents the people in them as our staff or clients.
 */

const WHO_WE_HELP = [
  { title: "Dental clinics", detail: "Single-location practices that want more of the right patients finding them online." },
  { title: "Practice owners", detail: "Owners who need a clear, prioritised view of what their website and listings are doing for them." },
  { title: "Dentists", detail: "Clinicians who want plain-English answers, not marketing jargon or vanity metrics." },
  { title: "Practice managers", detail: "The people who field the enquiries and know where the patient journey breaks down." },
  { title: "Growing dental groups", detail: "Multi-location groups that need consistency across every practice's web presence." },
];

const FOCUS_AREAS: { Icon: typeof IconMapPin; title: string; detail: string; image: string; alt: string }[] = [
  {
    Icon: IconMapPin,
    title: "Local Visibility",
    detail: "Help practices improve how they appear across search and local discovery, where most patients start looking.",
    image: "/images/step-patient-search.jpg",
    alt: "A person searching on a smartphone",
  },
  {
    Icon: IconMonitor,
    title: "Website Experience",
    detail: "Make it easier for potential patients to understand your services and take the next step — call, book or ask a question.",
    image: "/images/focus-consultation.jpg",
    alt: "A dentist talking with a patient in a dental chair",
  },
  {
    Icon: IconSearch,
    title: "SEO & Content",
    detail: "Improve page structure, relevance and visibility without keyword stuffing or content written for robots.",
    image: "/images/focus-imaging.jpg",
    alt: "Two dental professionals reviewing images on a computer screen",
  },
  {
    Icon: IconTrendingUp,
    title: "Performance & Insights",
    detail: "Use website audits, PageSpeed data and evidence to identify what should be fixed first.",
    image: "/images/step-review-findings.jpg",
    alt: "Two people reviewing results on a monitor",
  },
];

const APPROACH = [
  { title: "Understand the practice", detail: "Your services, the patients you want more of, and where enquiries come from today." },
  { title: "Audit what is happening now", detail: "We crawl your website, run technical and content checks, and pull Google's PageSpeed data for the pages that matter." },
  { title: "Prioritise the biggest opportunities", detail: "Findings are ranked by severity, how many pages they affect and the effort to fix — so you know what to do first." },
  { title: "Improve and measure", detail: "Fix what matters most, then re-check the same data to see what actually changed." },
];

const EVIDENCE_SOURCES = [
  "A crawl of your website's pages — titles, headings, content, links and images",
  "Technical checks: indexability, redirects, structured data, security and HTML weight",
  "Google PageSpeed Insights results on mobile and desktop — performance, accessibility, best practices and SEO basics",
  "How easily a visitor can find your phone number, services and a way to book",
];

/** Photo caption overlay: a deep plum wash so white text stays legible over bright clinic photos. */
const CAPTION_WASH = "absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(30,53,96,0.94)] via-[rgba(30,53,96,0.7)] to-transparent text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]";

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
                  Smile AI Marketing helps Canadian dental practices improve how they are found, understood and chosen online. We combine website strategy, local search visibility, performance insights and practical marketing recommendations to help practices build a stronger digital presence.
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
                <p className="text-eyebrow text-muted-foreground">What we&apos;re here for</p>
                <p className="mt-2 text-body-small text-foreground">More of the right patients finding, understanding and choosing your practice — with fixes you can see the evidence for.</p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who we help ── */}
      <section className="container-site section-space">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="min-w-0">
            <Reveal>
              <Eyebrow>Who we help</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">Dental practices, and the people who run them.</h2>
              <p className="mt-4 text-body-large text-muted-foreground">
                We work only with dentistry. That focus means the checks we run, the language we use and the fixes we recommend are built around how a patient actually chooses a dentist — not borrowed from a generic agency playbook.
              </p>
            </Reveal>
            <Reveal delay={0.12} className="mt-8">
              <div className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
                <Image
                  src="/images/about-team-tablet.jpg"
                  alt="Two dental team members showing a patient something on a tablet"
                  fill
                  sizes="(min-width: 1024px) 38vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none"
                  quality={80}
                />
                <div className={`${CAPTION_WASH} p-5 pt-24`}>
                  <p className="text-eyebrow text-white/85">The whole team</p>
                  <p className="mt-2 max-w-sm text-body-small">From the owner to the front desk, everyone sees the same findings in the same plain English.</p>
                </div>
              </div>
            </Reveal>
          </div>
          <RevealGroup className="grid content-start gap-4 sm:grid-cols-2" stagger={0.08}>
            {WHO_WE_HELP.map((item, i) => (
              <motion.div key={item.title} variants={revealItem} className={`card-gradient group flex items-start gap-3.5 p-5 ${i === WHO_WE_HELP.length - 1 && WHO_WE_HELP.length % 2 ? "sm:col-span-2" : ""}`}>
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-growth-soft text-growth-ink transition-colors duration-[var(--duration-normal)] group-hover:bg-growth-ink group-hover:text-white">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-heading-4 text-foreground">{item.title}</h3>
                  <p className="mt-1 text-body-small text-muted-foreground">{item.detail}</p>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ── What we focus on: interactive card scroll ── */}
      <FocusCarousel slides={FOCUS_AREAS} eyebrow="What we focus on" heading="Four things that decide whether a patient finds you and books." />

      {/* ── Our approach: vertical timeline with a scroll-following marker ── */}
      <ApproachTimeline
        steps={APPROACH}
        eyebrow="Our approach"
        heading="Simple, in the right order."
        intro="No audit is worth much if it hands you fifty things to fix and no order to fix them in. We follow the same four steps with every practice."
      />

      {/* ── Evidence before assumptions ── */}
      <section className="band-dark">
        <div className="container-site section-space">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
            <div className="max-w-xl">
              <Reveal>
                <Eyebrow tone="dark">Evidence before assumptions</Eyebrow>
                <h2 className="mt-4 text-heading-2 text-foreground">Recommendations you can check for yourself.</h2>
                <p className="mt-4 text-body-large text-muted-foreground">
                  Every recommendation we make is tied to something we measured on your website: a crawl of your pages, technical checks and Google&apos;s own performance data. You see what was tested, what was found and why it matters before anything is proposed.
                </p>
                <p className="mt-4 text-body text-muted-foreground">
                  What we won&apos;t do is promise a ranking, a number of enquiries or a revenue figure. Results depend on your market, your competitors and where your practice is starting from — so we show the evidence and let it make the case.
                </p>
              </Reveal>
              <RevealGroup className="mt-8" stagger={0.08}>
                <div className="card-gradient p-6 sm:p-7">
                  <p className="text-eyebrow text-muted-foreground">What our recommendations are based on</p>
                  <ul className="mt-5 space-y-4">
                    {EVIDENCE_SOURCES.map((item) => (
                      <motion.li key={item} variants={revealItem} className="flex items-start gap-3 text-body-small text-foreground-secondary">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </RevealGroup>
            </div>
            <Reveal delay={0.1}>
              <div className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
                <Image
                  src="/images/about-evidence-xray.jpg"
                  alt="A dentist showing a dental x-ray on a tablet to a patient"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none"
                  quality={80}
                />
                <div className={`${CAPTION_WASH} p-6 pt-28`}>
                  <p className="text-eyebrow text-white/85">Show, don&apos;t tell</p>
                  <p className="mt-2 max-w-sm text-body-small">You would not accept a treatment plan without seeing the x-ray. We apply the same standard to your website.</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Canadian dental focus ── */}
      <section className="container-site section-space">
        <Reveal>
          <div className="group relative overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
            <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-[20/9]">
              <Image
                src="/images/about-clinic-wide.jpg"
                alt="Two dentists reviewing a dental x-ray on a screen in a bright clinic"
                fill
                sizes="(min-width: 1280px) 80vw, 100vw"
                className="object-cover transition-transform duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none"
                quality={80}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[rgba(30,53,96,0.95)] via-[rgba(30,53,96,0.6)] to-[rgba(30,53,96,0.08)]" aria-hidden />
            </div>
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-xl p-6 text-white sm:p-10 lg:p-14">
                <Eyebrow className="!text-white/85">Canadian dental focus</Eyebrow>
                <h2 className="mt-4 text-heading-2 text-white">Built for practices in Canada.</h2>
                <p className="mt-4 text-body text-white/85">
                  Everything here — the audit, the recommendations and the way we talk about them — is designed around Canadian dental practices: how patients search for a dentist near them, how practices present their services, and what a clinic&apos;s website needs to do well.
                </p>
                <p className="mt-4 hidden text-body-small text-white/75 xl:block">
                  We work with practices across Canada, starting in {TARGET_CITY}, {TARGET_PROVINCE}. Because the audit runs entirely on your public website and listings, there is nothing to install and no account access to hand over.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
