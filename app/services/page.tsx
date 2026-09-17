import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Eyebrow from "@/components/Eyebrow";
import { ButtonArrow } from "@/components/ui/buttonStyles";
import { SERVICES } from "@/lib/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Digital marketing services for Canadian dental practices from Smile AI Marketing — local SEO and Google visibility, website and booking experience, reviews and reputation.",
  alternates: { canonical: "/services" },
};

export default function ServicesIndexPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        <div className="container-site section-space">
          <div className="max-w-2xl">
            <Eyebrow>Services</Eyebrow>
            <h1 className="mt-5 text-heading-1 text-foreground">
              Marketing services for Canadian dental practices.
            </h1>
            <p className="mt-5 text-body-large text-muted-foreground">
              Dental-only and evidence-based. Every service starts with the same free website audit, so you see what needs fixing before you ever talk to us.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {SERVICES.map((service, i) => (
              <Link
                key={service.slug}
                href={`/services/${service.slug}`}
                className="card group flex flex-col justify-between p-6 transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground hover:shadow-md sm:p-8"
              >
                <div>
                  <span className="font-display text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-border-strong">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-6 text-heading-3 text-foreground">{service.title}</h2>
                  <p className="mt-3 text-body-small text-muted-foreground">{service.subhead}</p>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-body-small font-semibold text-primary-ink">
                  Learn more
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
