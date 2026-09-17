import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import ServiceIcon from "@/components/ServiceIcon";
import { ServiceVisual } from "@/components/visuals/ServiceVisual";
import { ButtonArrow, buttonClasses } from "@/components/ui/buttonStyles";
import { FEATURED_SERVICES, SERVICES } from "@/lib/services";

/**
 * Answers "what does Smile AI Marketing actually do?" on the homepage. Shows
 * the featured services from the catalogue (lib/services.ts) and points to
 * /services for the rest — the homepage stays a summary, not a menu.
 */
export default function ServicesOverview() {
  const remaining = SERVICES.length - FEATURED_SERVICES.length;
  return (
    <section id="services" className="scroll-mt-[var(--header-height)] bg-background">
      <div className="container-site section-space">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow>What we do</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">
              Marketing built around how patients choose a dentist.
            </h2>
            <p className="mt-4 text-body-large text-muted-foreground">
              A patient has to find your practice, understand it, use your site on their phone and get in touch. Our services strengthen each of those steps — starting with what the free audit shows is weak on your site.
            </p>
          </div>
          <Link href="/services" className={buttonClasses({ variant: "secondary", className: "shrink-0 self-start lg:self-auto" })}>
            <span>Explore All Services</span>
            <ButtonArrow />
          </Link>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {FEATURED_SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="card group flex flex-col overflow-hidden p-6 transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground hover:shadow-md"
            >
              <ServiceVisual variant={s.icon} size="mini" flush className="-mx-6 -mt-6" />
              <span className="mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                <ServiceIcon icon={s.icon} />
              </span>
              <h3 className="mt-4 text-heading-4 text-foreground">{s.title}</h3>
              <p className="mt-2 flex-1 text-body-small text-muted-foreground">{s.short} {s.benefit}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-body-small font-medium text-primary-ink">
                Explore service
                <ButtonArrow />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-5 text-body-small text-muted-foreground">
          Plus {remaining} more — on-page and off-page SEO, content marketing and SEO audits.{" "}
          <Link href="/services" className="link-underline font-medium text-primary-ink">See all services</Link>.
        </p>
      </div>
    </section>
  );
}
