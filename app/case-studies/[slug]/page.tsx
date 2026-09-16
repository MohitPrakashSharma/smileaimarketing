import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
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
        <div className="border-b border-border-subtle bg-background-alt">
          <div className="container-site section-space">
            <div className="container-content !mx-0">
              <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-metadata">
                <Link href="/" className="link-underline hover:text-foreground">Home</Link>
                <span aria-hidden>/</span>
                <Link href="/case-studies" className="link-underline hover:text-foreground">Case Studies</Link>
                <span aria-hidden>/</span>
                <span className="text-foreground">{study.title}</span>
              </nav>

              <Eyebrow>{study.type === "internal-build" ? "Transparent Build Case Study" : "Case Study"}</Eyebrow>
              <h1 className="mt-4 max-w-[46rem] text-heading-1 text-foreground">{study.title}</h1>
              <p className="mt-3 text-metadata">
                Subject: {study.subject} &bull; Published {study.publishedAt}
              </p>
              <p className="mt-5 max-w-[46rem] text-body-large text-muted-foreground">{study.summary}</p>
            </div>
          </div>
        </div>

        <div className="container-site section-space">
          <div className="container-content !mx-0">
            <section>
              <h2 className="text-heading-2 text-foreground">The problem</h2>
              <p className="mt-4 text-body text-muted-foreground">{study.problem}</p>
            </section>

            <section className="mt-12">
              <h2 className="text-heading-2 text-foreground">Before &amp; after</h2>
              <div className="card mt-6 overflow-hidden !shadow-none">
                <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-border bg-background-alt px-5 py-3 text-eyebrow text-muted-foreground">
                  <span>Metric</span>
                  <span>Before</span>
                  <span>After</span>
                </div>
                {study.metrics.map((m) => (
                  <div key={m.label} className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-border-subtle px-5 py-4 text-body-small last:border-b-0">
                    <span className="font-semibold text-foreground">{m.label}</span>
                    <span className="text-muted-foreground">{m.before}</span>
                    <span className="font-semibold text-primary-ink">{m.after}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <h2 className="text-heading-2 text-foreground">What we did</h2>
              <div className="mt-6 divide-y divide-border-subtle border-y border-border-subtle">
                {study.actions.map((action) => (
                  <div key={action.category} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2.5fr)] sm:gap-8">
                    <h3 className="text-eyebrow text-primary-ink">{action.category}</h3>
                    <p className="text-body-small text-muted-foreground">{action.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-12">
              <h2 className="text-heading-2 text-foreground">Evidence</h2>
              <ul className="mt-6 space-y-3">
                {study.evidence.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-body-small text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="card mt-12 !bg-background-alt p-6 !shadow-none">
              <h2 className="text-eyebrow text-foreground">Limitations &amp; context</h2>
              <p className="mt-3 text-body-small text-muted-foreground">{study.limitations}</p>
            </section>

            <section className="mt-12">
              <h2 className="text-heading-2 text-foreground">Next steps</h2>
              <p className="mt-4 text-body text-muted-foreground">{study.nextSteps}</p>
            </section>

            <div className="band-dark mt-12 flex flex-col gap-6 rounded-[var(--radius-large)] p-8 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-heading-3 text-foreground">Curious what an audit finds for your practice?</p>
              <Link href="/free-dental-audit" className={buttonClasses({ variant: "light", className: "shrink-0" })}>
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
