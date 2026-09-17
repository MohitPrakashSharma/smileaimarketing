import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import PageCta from "@/components/PageCta";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { CASE_STUDIES, type CaseStudy } from "@/lib/caseStudies";

const SITE_URL = "https://smileaimarketing.com";
const TITLE = "Dental Marketing Case Studies";
const DESCRIPTION =
  "How Smile AI Marketing approaches visibility, website and patient-journey challenges for dental practices — documented work with verifiable evidence, not invented results.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/case-studies" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/case-studies`,
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

const TYPE_LABEL: Record<CaseStudy["type"], string> = {
  "internal-build": "Transparent build",
  client: "Client case study",
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

/** The work areas a study covers, taken from its own "What we did" sections. */
const categoriesOf = (study: CaseStudy) => study.actions.map((a) => a.category);

function CategoryChips({ study }: { study: CaseStudy }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Areas covered">
      {categoriesOf(study).map((category) => (
        <li
          key={category}
          className="rounded-full border border-border bg-background-alt px-3 py-1 text-[0.8125rem] font-medium text-foreground-secondary"
        >
          {category}
        </li>
      ))}
    </ul>
  );
}

/**
 * Used while there is a single published study: one wide feature instead of a
 * one-card grid. The moment a second study is added to CASE_STUDIES the page
 * switches to the grid below on its own.
 */
function FeaturedCaseStudy({ study }: { study: CaseStudy }) {
  const href = `/case-studies/${study.slug}`;
  const highlights = study.metrics.slice(0, 3);
  return (
    <article className="card overflow-hidden">
      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-eyebrow text-primary-ink">{TYPE_LABEL[study.type]}</span>
            <span className="text-metadata">Published {formatDate(study.publishedAt)}</span>
          </div>
          <h2 className="mt-5 text-heading-2 text-foreground">
            <Link href={href} className="hover:text-primary-ink transition-colors duration-[var(--duration-fast)]">
              {study.title}
            </Link>
          </h2>
          <p className="mt-4 max-w-[40rem] text-body text-muted-foreground">{study.summary}</p>
          <div className="mt-6">
            <CategoryChips study={study} />
          </div>
          <div className="mt-8">
            <Link href={href} className={buttonClasses({ variant: "dark" })}>
              <span>Read Case Study</span>
              <ButtonArrow />
            </Link>
          </div>
        </div>

        <aside className="border-t border-border bg-background-alt p-6 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
          <p className="text-eyebrow text-muted-foreground">What changed</p>
          <dl className="mt-5 divide-y divide-border-subtle">
            {highlights.map((m) => (
              <div key={m.label} className="grid gap-1 py-4 first:pt-0 last:pb-0">
                <dt className="text-body-small text-muted-foreground">{m.label}</dt>
                <dd className="grid gap-1 text-body-small">
                  <span className="text-muted-foreground">
                    <span className="text-metadata">Before</span> {m.before}
                  </span>
                  <span className="font-medium text-foreground">
                    <span className="text-metadata">After</span> {m.after}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-metadata">
            Subject: {study.subject}. Full before/after table, evidence and limitations are in the case study.
          </p>
        </aside>
      </div>
    </article>
  );
}

function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <Link
      href={`/case-studies/${study.slug}`}
      className="card group flex flex-col justify-between p-6 transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground hover:shadow-md sm:p-8"
    >
      <div>
        <span className="text-eyebrow text-primary-ink">{TYPE_LABEL[study.type]}</span>
        <h2 className="mt-5 text-heading-3 text-foreground">{study.title}</h2>
        <p className="mt-3 text-body-small text-muted-foreground">{study.summary}</p>
        <div className="mt-5">
          <CategoryChips study={study} />
        </div>
      </div>
      <span className="mt-8 inline-flex items-center gap-2 text-body-small font-medium text-primary-ink">
        Read Case Study
        <ButtonArrow />
      </span>
    </Link>
  );
}

export default function CaseStudiesIndexPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="container-site section-space">
          <div className="max-w-2xl">
            <Eyebrow>Case Studies</Eyebrow>
            <h1 className="mt-5 text-heading-1 text-foreground">
              Dental Marketing Work Built Around Real Practice Challenges
            </h1>
            <p className="mt-5 text-body-large text-muted-foreground">
              See how we approach visibility, websites, local search and patient acquisition challenges for dental practices.
            </p>
          </div>

          <div className="mt-12 sm:mt-14">
            {CASE_STUDIES.length === 1 ? (
              <FeaturedCaseStudy study={CASE_STUDIES[0]} />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {CASE_STUDIES.map((study) => (
                  <CaseStudyCard key={study.slug} study={study} />
                ))}
              </div>
            )}
          </div>

          <p className="mt-8 max-w-2xl text-body-small text-muted-foreground">
            Every case study here is backed by a verifiable source. We don&apos;t publish fabricated results, guaranteed rankings or invented statistics — client work is added only once its results are verified and the practice has agreed to share them.
          </p>
        </div>
      </main>
      <PageCta
        heading="Want to Find the Growth Opportunities on Your Website?"
        copy="Start with a website audit and see where your dental practice could improve its visibility, performance and patient journey."
      />
      <Footer />
    </>
  );
}
