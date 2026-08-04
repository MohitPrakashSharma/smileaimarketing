import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
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
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Case Studies</Eyebrow>
            <h1 className="mt-4 text-heading-1 font-semibold text-foreground">
              Evidence, not claims.
            </h1>
            <p className="mt-4 text-body text-muted-foreground">
              Every case study here is backed by a verifiable source. We don&apos;t publish fabricated results, guaranteed rankings, or invented statistics.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-6">
            {CASE_STUDIES.map((study) => (
              <Link
                key={study.slug}
                href={`/case-studies/${study.slug}`}
                className="block rounded-2xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-primary/40 sm:p-8"
              >
                <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
                  {study.type === "internal-build" ? "TRANSPARENT BUILD" : "CLIENT CASE STUDY"}
                </span>
                <h2 className="mt-4 text-heading-3 font-semibold text-foreground">{study.title}</h2>
                <p className="mt-3 text-body-small text-muted-foreground leading-relaxed">{study.summary}</p>
                <span className="mt-5 inline-block text-body-small font-semibold text-primary">
                  Read the full case study &rarr;
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
