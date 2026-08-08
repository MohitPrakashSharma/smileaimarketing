import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { IconCheck } from "@/components/icons";
import { SERVICES, getServiceBySlug } from "@/lib/services";

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

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

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
        {/* Hero */}
        <div className="border-b border-border bg-white">
          <div className="mx-auto max-w-[800px] px-6 py-16 sm:px-8 sm:py-24">
            <nav aria-label="Breadcrumb" className="mb-8 text-metadata text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <span className="mx-2">/</span>
              <Link href="/services" className="hover:text-foreground">Services</Link>
              <span className="mx-2">/</span>
              <span className="text-foreground">{service.title}</span>
            </nav>

            <Eyebrow>{service.eyebrow}</Eyebrow>
            <h1 className="mt-4 text-heading-1 font-semibold text-foreground">{service.h1}</h1>
            <p className="mt-6 text-body-large text-muted-foreground leading-relaxed">{service.subhead}</p>

            <Link
              href="/free-dental-audit"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-body text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Audit My Practice
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-[800px] px-6 py-16 sm:px-8 sm:py-24">
          {/* What we check */}
          <section>
            <h2 className="text-heading-3 font-semibold text-foreground">What we actually check</h2>
            <div className="mt-6 space-y-4">
              {service.whatWeCheck.map((item) => (
                <div key={item.title} className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h3 className="text-body-small font-bold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-body-small text-muted-foreground leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Common problems */}
          <section className="mt-14">
            <h2 className="text-heading-3 font-semibold text-foreground">Common problems we find</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {service.commonProblems.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-surface p-5">
                  <h3 className="text-body-small font-bold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-body-small text-muted-foreground leading-relaxed">{item.detail}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-14">
            <h2 className="text-heading-3 font-semibold text-foreground">Questions about local SEO</h2>
            <div className="mt-6 divide-y divide-border border-y border-border">
              {service.faqs.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-body font-semibold text-foreground marker:content-none focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 -mx-2">
                    {item.q}
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary transition-transform duration-200 group-open:rotate-45"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-body-small text-muted-foreground leading-relaxed pl-2">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Final CTA */}
          <div className="mt-14 rounded-2xl border border-border bg-surface-muted/30 p-8 text-center">
            <p className="text-body font-semibold text-foreground">See where your practice actually stands.</p>
            <p className="mt-2 text-body-small text-muted-foreground">Free audit — just your website and city.</p>
            <Link
              href="/free-dental-audit"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-body text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Audit My Practice
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
