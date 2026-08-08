import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { CASE_STUDIES, getCaseStudyBySlug } from "@/lib/caseStudies";

const SITE_URL = "https://smileaimarketing.com";

export function generateStaticParams() {
  return CASE_STUDIES.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) return {};

  const brandedTitle = `${study.seoTitle} | Smile AI Marketing`;

  return {
    title: study.seoTitle,
    description: study.metaDescription,
    alternates: { canonical: `/case-studies/${study.slug}` },
    openGraph: {
      type: "article",
      url: `${SITE_URL}/case-studies/${study.slug}`,
      siteName: "Smile AI Marketing",
      title: brandedTitle,
      description: study.metaDescription,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: study.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: brandedTitle,
      description: study.metaDescription,
      images: ["/opengraph-image"],
    },
  };
}

export default async function CaseStudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = getCaseStudyBySlug(slug);
  if (!study) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.metaDescription,
    datePublished: study.publishedAt,
    dateModified: study.publishedAt,
    author: { "@type": "Organization", name: "Smile AI Marketing" },
    publisher: { "@type": "Organization", name: "Smile AI Marketing" },
    mainEntityOfPage: `${SITE_URL}/case-studies/${study.slug}`,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Case Studies", item: `${SITE_URL}/case-studies` },
      { "@type": "ListItem", position: 3, name: study.title, item: `${SITE_URL}/case-studies/${study.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[800px] px-6 py-16 sm:px-8 sm:py-24">
          <nav aria-label="Breadcrumb" className="mb-8 text-metadata text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/case-studies" className="hover:text-foreground">Case Studies</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{study.title}</span>
          </nav>

          <Eyebrow>{study.type === "internal-build" ? "Transparent Build Case Study" : "Case Study"}</Eyebrow>
          <h1 className="mt-4 text-heading-1 font-semibold text-foreground">{study.title}</h1>
          <p className="mt-2 text-metadata text-muted-foreground">
            Subject: {study.subject} &bull; Published {study.publishedAt}
          </p>
          <p className="mt-6 text-body-large text-muted-foreground leading-relaxed">{study.summary}</p>

          <section className="mt-12">
            <h2 className="text-heading-3 font-semibold text-foreground">The problem</h2>
            <p className="mt-3 text-body text-muted-foreground leading-relaxed">{study.problem}</p>
          </section>

          <section className="mt-12">
            <h2 className="text-heading-3 font-semibold text-foreground">Before &amp; after</h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-border bg-surface-muted/40 p-4 text-metadata font-bold uppercase tracking-wider text-muted-foreground">
                <span>Metric</span>
                <span>Before</span>
                <span>After</span>
              </div>
              {study.metrics.map((m) => (
                <div key={m.label} className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-border bg-surface p-4 text-body-small last:border-b-0">
                  <span className="font-semibold text-foreground">{m.label}</span>
                  <span className="text-muted-foreground">{m.before}</span>
                  <span className="font-semibold text-primary">{m.after}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-heading-3 font-semibold text-foreground">What we did</h2>
            <div className="mt-4 space-y-4">
              {study.actions.map((action) => (
                <div key={action.category} className="rounded-xl border border-border bg-surface p-5">
                  <h3 className="text-body-small font-bold uppercase tracking-wider text-primary">{action.category}</h3>
                  <p className="mt-2 text-body-small text-muted-foreground leading-relaxed">{action.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-heading-3 font-semibold text-foreground">Evidence</h2>
            <ul className="mt-4 space-y-2">
              {study.evidence.map((item) => (
                <li key={item} className="flex items-start gap-3 text-body-small text-muted-foreground">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-12 rounded-2xl border border-border bg-surface-muted/30 p-6">
            <h2 className="text-body-small font-bold uppercase tracking-wider text-foreground">Limitations &amp; context</h2>
            <p className="mt-3 text-body-small text-muted-foreground leading-relaxed">{study.limitations}</p>
          </section>

          <section className="mt-12">
            <h2 className="text-heading-3 font-semibold text-foreground">Next steps</h2>
            <p className="mt-3 text-body text-muted-foreground leading-relaxed">{study.nextSteps}</p>
          </section>

          <div className="mt-12 rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
            <p className="text-body font-semibold text-foreground">Curious what an audit finds for your practice?</p>
            <Link
              href="/free-dental-audit"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-body text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
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
