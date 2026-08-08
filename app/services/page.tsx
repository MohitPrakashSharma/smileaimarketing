import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Dental-specific marketing services from Smile AI Marketing — local SEO, Google Business Profile, website conversion, reputation, and AI search visibility.",
  alternates: { canonical: "/services" },
};

export default function ServicesIndexPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>Services</Eyebrow>
            <h1 className="mt-4 text-heading-1 font-semibold text-foreground">
              Dental-only. Evidence-based.
            </h1>
            <p className="mt-4 text-body text-muted-foreground">
              Every service starts with the same free audit — so you see what needs fixing before you ever talk to us.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-3xl gap-6">
            {SERVICES.map((service) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="block rounded-2xl border border-border bg-surface p-6 shadow-sm transition-colors hover:border-primary/40 sm:p-8"
              >
                <h2 className="text-heading-3 font-semibold text-foreground">{service.title}</h2>
                <p className="mt-3 text-body-small text-muted-foreground leading-relaxed">{service.subhead}</p>
                <span className="mt-5 inline-block text-body-small font-semibold text-primary">
                  Learn more &rarr;
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
