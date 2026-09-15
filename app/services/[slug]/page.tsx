import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { IconCheck } from "@/components/icons";
import FaqList from "@/components/ui/FaqList";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
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
        <div className="border-b border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="container-narrow !mx-0">
              <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-metadata">
                <Link href="/" className="link-underline hover:text-foreground">Home</Link>
                <span aria-hidden>/</span>
                <Link href="/services" className="link-underline hover:text-foreground">Services</Link>
                <span aria-hidden>/</span>
                <span className="text-foreground">{service.title}</span>
              </nav>

              <Eyebrow>{service.eyebrow}</Eyebrow>
              <h1 className="mt-5 text-heading-1 text-foreground">{service.h1}</h1>
              <p className="mt-6 text-body-large text-muted-foreground">{service.subhead}</p>

              <Link href="/free-dental-audit" className={buttonClasses({ className: "mt-9" })}>
                <span>Audit My Practice</span>
                <ButtonArrow />
              </Link>
            </div>
          </div>
        </div>

        <div className="container-site section-space">
          <div className="container-narrow !mx-0">
            {/* What we check */}
            <section>
              <h2 className="text-heading-2 text-foreground">What we actually check</h2>
              <div className="mt-8 divide-y divide-border-subtle border-y border-border-subtle">
                {service.whatWeCheck.map((item) => (
                  <div key={item.title} className="flex items-start gap-4 py-5">
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

            {/* Common problems */}
            <section className="mt-16">
              <h2 className="text-heading-2 text-foreground">Common problems we find</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {service.commonProblems.map((item) => (
                  <div key={item.title} className="card p-5">
                    <h3 className="text-heading-4 text-foreground">{item.title}</h3>
                    <p className="mt-2 text-body-small text-muted-foreground">{item.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* FAQ */}
            <section className="mt-16">
              <h2 className="text-heading-2 text-foreground">Questions about local SEO</h2>
              <FaqList items={service.faqs} className="mt-8" />
            </section>

            {/* Final CTA */}
            <div className="band-dark mt-16 rounded-[var(--radius-large)] p-8 sm:p-10">
              <p className="text-heading-3 text-foreground">See where your practice actually stands.</p>
              <p className="mt-2 text-body text-muted-foreground">Free audit — just your website and city.</p>
              <Link href="/free-dental-audit" className={buttonClasses({ variant: "light", className: "mt-7" })}>
                <span>Audit My Practice</span>
                <ButtonArrow />
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
