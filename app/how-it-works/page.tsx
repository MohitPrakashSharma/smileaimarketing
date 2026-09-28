import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import PageCta from "@/components/PageCta";
import { Reveal } from "@/components/ui/Reveal";
import FocusAreas from "@/components/FocusAreas";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { HOW_IT_WORKS_STEPS } from "@/lib/howItWorks";
import { breadcrumbJsonLd, jsonLdProps, SITE_URL } from "@/lib/structuredData";

const TITLE = "How the Free Dental Website Audit Works";
const DESCRIPTION =
  "The four steps from your website address to a prioritised plan: what we check, what the Practice Growth Review contains, how long it takes, and what we will not promise.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/how-it-works" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/how-it-works`,
    siteName: "Smile AI Marketing",
    title: `${TITLE} | Smile AI Marketing`,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Smile AI Marketing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | Smile AI Marketing`,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

/** The steps, as schema.org understands them. */
const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: TITLE,
  description: DESCRIPTION,
  totalTime: "PT5M",
  // The audit is free; schema.org wants this stated rather than assumed.
  estimatedCost: { "@type": "MonetaryAmount", currency: "CAD", value: "0" },
  step: HOW_IT_WORKS_STEPS.map((step, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: step.title,
    text: step.expanded,
    url: `${SITE_URL}/how-it-works#step-${i + 1}`,
    image: `${SITE_URL}${step.image}`,
  })),
};

const WHAT_YOU_NEED = [
  { label: "Your practice website", detail: "The address a patient would type or click." },
  { label: "The city you are in", detail: "So the local comparison looks at the right area." },
  { label: "An email address", detail: "Only to send the report. It is not passed to anyone else." },
];

export default function HowItWorksPage() {
  return (
    <>
      <script {...jsonLdProps(howToJsonLd)} />
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "How It Works", path: "/how-it-works" }]))} />
      <Header />
      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="border-b border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
              <div className="max-w-2xl">
                <Eyebrow>How it works</Eyebrow>
                <h1 className="mt-5 text-heading-1 text-foreground">
                  From a Website Address to <span className="text-accent-gradient">a Plan, in Four Steps</span>
                </h1>
                <p className="mt-5 text-body-large text-muted-foreground">
                  The audit runs entirely on what is already public about your practice. There is nothing to install,
                  no account access to hand over, and no obligation at the end of it.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/free-dental-audit" className={buttonClasses()}>
                    <span>Get Your Free Website Audit</span>
                    <ButtonArrow />
                  </Link>
                  <Link href="/book-consultation" className={buttonClasses({ variant: "secondary" })}>
                    Book a Consultation
                  </Link>
                </div>
              </div>

              <Reveal delay={0.1}>
                <div className="card-teal p-6 sm:p-7">
                  <p className="text-eyebrow text-secondary-ink">What you need</p>
                  <ul className="mt-5 space-y-4">
                    {WHAT_YOU_NEED.map((item) => (
                      <li key={item.label}>
                        <span className="block text-body-small font-bold text-foreground">{item.label}</span>
                        <span className="mt-0.5 block text-body-small text-muted-foreground">{item.detail}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 border-t border-secondary/25 pt-4 text-metadata text-muted-foreground">
                    No passwords. No Google account access. Nothing installed on your website.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* The four steps */}
        <section className="container-site section-space" aria-labelledby="steps-heading">
          <div className="max-w-2xl">
            <Eyebrow>The process</Eyebrow>
            <h2 id="steps-heading" className="mt-4 text-heading-2 text-foreground">
              What happens, in order.
            </h2>
          </div>

          <ol className="mt-12 space-y-14 lg:space-y-20">
            {HOW_IT_WORKS_STEPS.map((step, i) => {
              const number = String(i + 1).padStart(2, "0");
              const flip = i % 2 === 1;
              return (
                <li key={step.title} id={`step-${i + 1}`} className="scroll-mt-[calc(var(--header-height)+2rem)]">
                  <Reveal>
                    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                      <div className={flip ? "lg:order-2" : undefined}>
                        <span className="font-display text-[2.5rem] font-bold leading-none tracking-[-0.03em] text-accent-gradient">
                          {number}
                        </span>
                        <h3 className="mt-4 text-heading-3 text-foreground">{step.title}</h3>
                        <p className="mt-4 text-body-large text-muted-foreground">{step.expanded}</p>
                        <ul className="mt-6 space-y-2.5">
                          {step.points.map((point) => (
                            <li key={point} className="flex items-start gap-3 text-body-small text-foreground-secondary">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden />
                              {point}
                            </li>
                          ))}
                        </ul>
                        <p className="mt-6 inline-flex items-center gap-2.5 rounded-full bg-secondary-soft px-4 py-2 text-metadata text-secondary-ink">
                          {step.note}
                        </p>
                      </div>

                      <div className={flip ? "lg:order-1" : undefined}>
                        <div className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
                          <Image
                            src={step.image}
                            alt={step.alt}
                            fill
                            priority={i === 0}
                            sizes="(min-width: 1024px) 45vw, 100vw"
                            className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none"
                            quality={80}
                          />
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </section>

        {/* What the work covers */}
        <FocusAreas />

        {/* What we won't promise */}
        <section className="border-y border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div>
                <Eyebrow>Before you start</Eyebrow>
                <h2 className="mt-4 text-heading-2 text-foreground">What this will not tell you.</h2>
              </div>
              <div className="max-w-[46rem] space-y-4">
                <p className="text-body-large text-muted-foreground">
                  The audit measures what is publicly visible about your practice today. It does not predict rankings,
                  enquiry counts or revenue, and we will not put a number on any of those — search results depend on
                  factors no agency controls.
                </p>
                <p className="text-body text-muted-foreground">
                  What it does give you is a clear picture of where your practice stands right now, what is realistic
                  to improve, and which fixes are most likely to affect enquiries first. Everything in the report is
                  tied to something we measured, so you can check it yourself.
                </p>
                <p className="text-body-small">
                  <Link href="/about" className="link-underline font-semibold text-primary-ink">
                    Read how we work
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PageCta
        heading="See What Your Dental Website Could Be Doing Better"
        copy="Start with the free audit — the first preview appears in seconds, and the full report lands in your inbox."
      />
      <Footer />
    </>
  );
}
