import Image from "next/image";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { ButtonArrow, buttonClasses } from "@/components/ui/buttonStyles";

/**
 * Answers "what does Smile AI Marketing actually do?" on the homepage. Shows
 * the featured services from the catalogue (lib/services.ts) and points to
 * /services for the rest — the homepage stays a summary, not a menu.
 */
export default function ServicesOverview() {
  return (
    <section id="services" className="scroll-mt-[var(--header-height)] bg-background">
      <div className="container-site section-space">
        {/* Split intro: copy on the left, a real treatment room on the right */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center lg:gap-14">
          <div className="max-w-2xl">
            <Eyebrow>What we do</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">
              Marketing built around how patients choose a dentist.
            </h2>
            <p className="mt-4 text-body-large text-muted-foreground">
              A patient has to find your practice, understand it, use your site on their phone and get in touch. Our services strengthen each of those steps — starting with what the free audit shows is weak on your site.
            </p>
            <Link href="/services" className={buttonClasses({ variant: "secondary", className: "mt-8" })}>
              <span>Explore All Services</span>
              <ButtonArrow />
            </Link>
          </div>
          <figure className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
            <Image
              src="/images/dental-xray-review.jpg"
              alt="A dentist pointing at a dental X-ray on a screen while a patient looks on from the chair"
              fill
              sizes="(min-width: 1024px) 50vw, (min-width: 640px) 90vw, 100vw"
              className="object-cover"
              quality={80}
            />
            <figcaption className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2 sm:bottom-5 sm:left-5">
              <span className="rounded-full bg-surface/90 px-3 py-1.5 text-metadata font-semibold text-foreground shadow-sm backdrop-blur">
                Chosen online, before the first visit
              </span>
            </figcaption>
          </figure>
        </div>

      </div>
    </section>
  );
}
