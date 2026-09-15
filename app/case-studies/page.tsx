import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { ButtonArrow } from "@/components/ui/buttonStyles";
import { CASE_STUDIES } from "@/lib/caseStudies";

export const metadata: Metadata = {
  title: "Case Studies",
  description:
    "Verified case studies from Smile AI Marketing — real, evidence-backed work, never fabricated results or guaranteed rankings.",
  alternates: { canonical: "/case-studies" },
};

export default function CaseStudiesIndexPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="container-site section-space">
          <div className="max-w-2xl">
            <Eyebrow>Case Studies</Eyebrow>
            <h1 className="mt-5 text-heading-1 text-foreground">
              Evidence, not claims.
            </h1>
            <p className="mt-5 text-body-large text-muted-foreground">
              Every case study here is backed by a verifiable source. We don&apos;t publish fabricated results, guaranteed rankings, or invented statistics.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {CASE_STUDIES.map((study) => (
              <Link
                key={study.slug}
                href={`/case-studies/${study.slug}`}
                className="card group flex flex-col justify-between p-6 transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground hover:shadow-md sm:p-8"
              >
                <div>
                  <span className="text-eyebrow text-primary-ink">
                    {study.type === "internal-build" ? "Transparent build" : "Client case study"}
                  </span>
                  <h2 className="mt-5 text-heading-3 text-foreground">{study.title}</h2>
                  <p className="mt-3 text-body-small text-muted-foreground">{study.summary}</p>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-body-small font-semibold text-primary-ink">
                  Read the full case study
                  <ButtonArrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
