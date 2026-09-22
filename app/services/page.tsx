import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import PageCta from "@/components/PageCta";
import ServiceIcon from "@/components/ServiceIcon";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { JourneyVisual } from "@/components/visuals/compositions";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { SERVICES } from "@/lib/services";

const SITE_URL = "https://smileaimarketing.com";
const TITLE = "Dental Marketing Services";
const DESCRIPTION =
  "Digital marketing services for Canadian dental practices: website design and development, local SEO, on-page and technical SEO, off-page SEO, content marketing, conversion rate optimization and SEO audits.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/services" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/services`,
    siteName: "Smile AI Marketing",
    title: `${TITLE} | Smile AI Marketing`,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Smile AI Marketing" }],
  },
  twitter: { card: "summary_large_image", title: `${TITLE} | Smile AI Marketing`, description: DESCRIPTION, images: ["/opengraph-image"] },
};

/** How the services map onto the patient's path — a practice only needs the stages where its own site falls short. */
const JOURNEY: { stage: string; question: string; services: string[]; detail: string }[] = [
  { stage: "Being found", question: "Can a nearby patient find the practice at all?", services: ["local-seo-for-dentists", "off-page-seo"], detail: "Local search visibility and the references that give search engines confidence in the practice." },
  { stage: "Being understood", question: "Does the site answer what the patient is searching for?", services: ["on-page-seo", "dental-content-marketing"], detail: "Pages that match real patient questions, with titles, headings and content search engines can read." },
  { stage: "Loading and working", question: "Does the site load and work on the phone in their hand?", services: ["technical-seo-pagespeed", "dental-website-design-development"], detail: "Crawlable, indexable pages that load quickly and behave properly on mobile." },
  { stage: "Taking the next step", question: "Is it obvious how to call or book?", services: ["conversion-rate-optimization", "dental-website-design-development"], detail: "Clear calls to action, short forms and an appointment journey that reaches the front desk." },
];

const byslug = Object.fromEntries(SERVICES.map((s) => [s.slug, s]));

export default function ServicesIndexPage() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: SERVICES.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.title, url: `${SITE_URL}/services/${s.slug}` })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <Header />
      <main className="flex-1 bg-background">
        {/* Hero */}
        <section className="border-b border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="max-w-3xl">
              <Eyebrow>Dental marketing services</Eyebrow>
              <h1 className="mt-5 text-heading-1 text-foreground">Digital Marketing Services Built for Dental Practices</h1>
              <p className="mt-5 max-w-2xl text-body-large text-muted-foreground">
                From website development and local SEO to technical improvements and conversion optimization, explore services designed to help Canadian dental practices strengthen their online presence.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/free-dental-audit" className={buttonClasses()}>
                  <span>Get Your Free Website Audit</span>
                  <ButtonArrow />
                </Link>
                <Link href="/book-consultation" className={buttonClasses({ variant: "secondary" })}>
                  Book a Consultation
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Service grid */}
        <section className="container-site section-space" aria-labelledby="all-services">
          <div className="max-w-2xl">
            <Eyebrow>All services</Eyebrow>
            <h2 id="all-services" className="mt-4 text-heading-2 text-foreground">Eight services, one starting point: your website.</h2>
            <p className="mt-4 text-body-large text-muted-foreground">Every service below starts from what the free audit finds on your site — so the work is specific to your practice, not a package.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SERVICES.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="card group flex flex-col overflow-hidden p-6 transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground hover:shadow-md"
              >
                <ServiceVisual variant={s.icon} size="mini" flush className="-mx-6 -mt-6" />
                <span className="mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary-ink">
                  <ServiceIcon icon={s.icon} />
                </span>
                <h3 className="mt-4 text-heading-4 text-foreground">{s.title}</h3>
                <p className="mt-2 text-body-small text-muted-foreground">{s.summary}</p>
                <p className="mt-3 flex-1 text-body-small text-foreground">
                  <span className="font-medium">Benefit:</span> {s.benefit}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-body-small font-medium text-primary-ink">
                  Explore service
                  <ButtonArrow />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* How the services work together */}
        <section className="border-y border-border-subtle bg-background-alt" aria-labelledby="journey">
          <div className="container-site section-space">
            <div className="max-w-2xl">
              <Eyebrow>How our services work together</Eyebrow>
              <h2 id="journey" className="mt-4 text-heading-2 text-foreground">Each service supports a different part of the patient&apos;s path.</h2>
              <p className="mt-4 text-body-large text-muted-foreground">
                A patient has to find the practice, understand it, use the site on their phone and then get in touch. Different services strengthen different steps — and not every practice needs every one. The audit shows which steps are weak on your site.
              </p>
            </div>
            <div className="mt-10">
              <JourneyVisual />
            </div>
            <ol className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {JOURNEY.map((j, i) => (
                <li key={j.stage} className="card flex flex-col p-6">
                  <span className="font-display text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-border-strong">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mt-5 text-heading-4 text-foreground">{j.stage}</h3>
                  <p className="mt-1 text-body-small font-medium text-foreground">{j.question}</p>
                  <p className="mt-2 flex-1 text-body-small text-muted-foreground">{j.detail}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {j.services.map((slug) => (
                      <li key={slug}>
                        <Link href={`/services/${slug}`} className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[0.8125rem] font-medium text-foreground-secondary transition-colors duration-[var(--duration-fast)] hover:border-foreground hover:text-foreground">
                          {byslug[slug].title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Where should you start? */}
        <section className="container-site section-space" aria-labelledby="start">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
            <div>
              <Eyebrow>Where should you start?</Eyebrow>
              <h2 id="start" className="mt-4 text-heading-2 text-foreground">Find out what needs attention before you choose a service.</h2>
              <p className="mt-4 text-body-large text-muted-foreground">
                Our free website audit crawls your site, runs technical, on-page and performance checks, and ranks every verified finding by severity. It tells you what is actually wrong — and often that some services on this page are not something you need yet.
              </p>
              <Link href="/free-dental-audit" className={buttonClasses({ className: "mt-8" })}>
                <span>Get Your Free Website Audit</span>
                <ButtonArrow />
              </Link>
            </div>
            <ul className="card divide-y divide-border-subtle p-2">
              {[
                ["Two minutes, no logins", "Just your website and city. The audit runs from your public site."],
                ["Verified findings only", "Every issue is tied to the pages it affects, with severity and effort."],
                ["A prioritized order", "Most serious first, quick wins marked — so you know where to start."],
                ["Reviewed with you", "Book a walkthrough and we will explain what each finding means for your practice."],
              ].map(([t, d]) => (
                <li key={t} className="p-4">
                  <p className="text-heading-4 text-foreground">{t}</p>
                  <p className="mt-1 text-body-small text-muted-foreground">{d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <PageCta
        eyebrow="Talk to us"
        heading="Not sure which service fits your practice?"
        copy="Book a website review with our team. We will look at your site and your goals and tell you plainly which of these services are worth considering — and which are not."
      />
      <Footer />
    </>
  );
}
