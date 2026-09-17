import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import ServiceIcon from "@/components/ServiceIcon";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { IconCheck } from "@/components/icons";
import FaqList from "@/components/ui/FaqList";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { SERVICES, getServiceBySlug, relatedServices } from "@/lib/services";

const SITE_URL = "https://smileaimarketing.com";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  return {
    title: service.seoTitle,
    description: service.metaDescription,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      type: "website",
      url: `${SITE_URL}/services/${service.slug}`,
      siteName: "Smile AI Marketing",
      title: `${service.seoTitle} | Smile AI Marketing`,
      description: service.metaDescription,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: service.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${service.seoTitle} | Smile AI Marketing`,
      description: service.metaDescription,
      images: ["/opengraph-image"],
    },
  };
}

/**
 * One template for every service. All copy comes from lib/services.ts; the
 * template only decides the order and the design: hero → what it is → the
 * problems it addresses → what's included → process → benefits → related
 * services → FAQs → consultation CTA. Every page also links to the free audit,
 * which is the entry point for all of them.
 */
export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();
  const related = relatedServices(service);

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: service.title,
    name: service.title,
    description: service.metaDescription,
    url: `${SITE_URL}/services/${service.slug}`,
    provider: { "@type": "Organization", name: "Smile AI Marketing" },
    areaServed: "CA",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Services", item: `${SITE_URL}/services` },
      { "@type": "ListItem", position: 3, name: service.title, item: `${SITE_URL}/services/${service.slug}` },
    ],
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Header />
      <main className="flex-1 bg-background">
        {/* 1. Hero */}
        <div className="border-b border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-16">
              <div>
                <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-metadata">
                  <Link href="/" className="link-underline hover:text-foreground">Home</Link>
                  <span aria-hidden>/</span>
                  <Link href="/services" className="link-underline hover:text-foreground">Services</Link>
                  <span aria-hidden>/</span>
                  <span className="text-foreground">{service.title}</span>
                </nav>
                <Eyebrow>{service.eyebrow}</Eyebrow>
                <h1 className="mt-4 max-w-[46rem] text-heading-1 text-foreground">{service.h1}</h1>
                <p className="mt-5 max-w-[46rem] text-body-large text-muted-foreground">{service.subhead}</p>
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
              <ServiceVisual variant={service.icon} />
            </div>
          </div>
        </div>

        {/* Benefits at a glance */}
        <div className="border-b border-border-subtle bg-background">
          <div className="container-site">
            <ul className="grid divide-y divide-border-subtle sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              {service.benefits.map((b, i) => (
                <li key={b} className={`flex items-start gap-3 py-4 text-body-small text-foreground ${i > 0 ? "lg:pl-6" : ""} ${i < service.benefits.length - 1 ? "lg:pr-6" : ""}`}>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                    <IconCheck className="h-3 w-3" />
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <p className="pb-4 text-metadata">Practical outcomes of the work — not guarantees of rankings, patient numbers or revenue.</p>
          </div>
        </div>

        <div className="container-site section-space">
          {/* 2. What the service is */}
          <section className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
            <div>
              <Eyebrow>About this service</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">What it is, in plain language</h2>
            </div>
            <div className="max-w-[46rem] space-y-4">
              {service.overview.map((p) => (
                <p key={p.slice(0, 40)} className="text-body text-muted-foreground">
                  {p}
                </p>
              ))}
            </div>
          </section>

          {/* 3. Problems it addresses */}
          <section className="mt-16">
            <div className="max-w-2xl">
              <Eyebrow>Problems it addresses</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">What this fixes for a dental practice</h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {service.problems.map((item) => (
                <div key={item.title} className="card p-5 sm:p-6">
                  <h3 className="text-heading-4 text-foreground">{item.title}</h3>
                  <p className="mt-2 text-body-small text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. What's included */}
          <section className="mt-16">
            <div className="max-w-2xl">
              <Eyebrow>What&apos;s included</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">What the service covers</h2>
            </div>
            <div className="mt-6 grid border-t border-border-subtle sm:grid-cols-2 sm:gap-x-8">
              {service.includes.map((item) => (
                <div key={item.title} className="flex items-start gap-4 border-b border-border-subtle py-5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-heading-4 text-foreground">{item.title}</h3>
                    <p className="mt-1.5 text-body-small text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Process */}
          <section className="mt-16">
            <div className="max-w-2xl">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">The process, step by step</h2>
            </div>
            <ol className="relative mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="absolute top-6 bottom-6 left-6 w-px bg-border sm:hidden" aria-hidden="true" />
              {service.process.map((step, i) => (
                <li key={step.title} className="relative flex items-start gap-4 lg:flex-col lg:gap-5">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-display text-[0.9375rem] font-semibold text-foreground ring-4 ring-[var(--color-background)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="pt-2 lg:pt-0">
                    <h3 className="text-heading-4 text-foreground">{step.title}</h3>
                    <p className="mt-2 text-body-small text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* 6. Free audit tie-in + 7. Related services */}
        <section className="border-y border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
              <div className="card flex flex-col p-6 sm:p-8">
                <Eyebrow>Where to start</Eyebrow>
                <h2 className="mt-4 text-heading-3 text-foreground">Check your website first — it&apos;s free</h2>
                <p className="mt-3 flex-1 text-body-small text-muted-foreground">
                  Our free audit crawls your site and runs technical, on-page and performance checks, so you can see what actually needs attention before deciding whether this service is the right one.
                </p>
                <Link href="/free-dental-audit" className={buttonClasses({ size: "sm", className: "mt-6 self-start" })}>
                  <span>Get Your Free Website Audit</span>
                  <ButtonArrow />
                </Link>
              </div>
              <div>
                <Eyebrow>Works well with</Eyebrow>
                <h2 className="mt-4 text-heading-3 text-foreground">Related services</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/services/${r.slug}`} className="card group flex h-full flex-col p-5 transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground hover:shadow-md">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                          <ServiceIcon icon={r.icon} className="h-4 w-4" />
                        </span>
                        <span className="mt-4 text-heading-4 text-foreground">{r.title}</span>
                        <span className="mt-1.5 flex-1 text-body-small text-muted-foreground">{r.short}</span>
                        <span className="mt-4 inline-flex items-center gap-2 text-body-small font-medium text-primary-ink">
                          Explore
                          <ButtonArrow />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="container-site section-space">
          {/* 8. FAQ */}
          <section className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
            <div>
              <Eyebrow>FAQ</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">{service.faqHeading}</h2>
            </div>
            <FaqList items={service.faqs} />
          </section>

          {/* 9. Consultation CTA */}
          <div className="band-dark mt-16 flex flex-col gap-6 rounded-[var(--radius-large)] p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <p className="text-heading-3 text-foreground">{service.cta.heading}</p>
              <p className="mt-2 text-body text-muted-foreground">{service.cta.copy}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link href="/book-consultation" className={buttonClasses({ variant: "light" })}>
                <span>Book a Consultation</span>
                <ButtonArrow />
              </Link>
              <Link href="/free-dental-audit" className={buttonClasses({ variant: "secondary", className: "!border-white/30 !text-white hover:!bg-white/10" })}>
                Get Your Free Website Audit
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
