import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { IconMapPin, IconMonitor, IconStar } from "@/components/icons";
import { ButtonArrow } from "@/components/ui/buttonStyles";

/**
 * Answers "what does Smile AI Marketing actually do?" on the homepage. The
 * three areas mirror what the free audit reviews and what the consultation
 * covers — nothing here describes a service that isn't already offered.
 */
const AREAS: { Icon: typeof IconMapPin; title: string; detail: string; href: string; cta: string }[] = [
  {
    Icon: IconMapPin,
    title: "Local SEO and Google visibility",
    detail:
      "Show up when nearby patients search for a dentist. We review your Google Business Profile, local rankings and listing details, then work on what's holding your visibility back.",
    href: "/services/local-seo-for-dentists",
    cta: "Local SEO for dentists",
  },
  {
    Icon: IconMonitor,
    title: "Website and booking experience",
    detail:
      "Make it easy for patients to trust you and get in touch. We check speed, mobile layout and how quickly a visitor can find your phone number or request an appointment.",
    href: "/services",
    cta: "See our services",
  },
  {
    Icon: IconStar,
    title: "Reviews and reputation",
    detail:
      "Let existing patients speak for you. We look at how your reviews and ratings compare with nearby practices and what would strengthen them.",
    href: "/services",
    cta: "See our services",
  },
];

export default function ServicesOverview() {
  return (
    <section id="services" className="scroll-mt-[var(--header-height)] bg-background">
      <div className="container-site section-space">
        <div className="max-w-2xl">
          <Eyebrow>What we do</Eyebrow>
          <h2 className="mt-4 text-heading-2 text-foreground">
            Marketing built around how patients choose a dentist.
          </h2>
          <p className="mt-4 text-body-large text-muted-foreground">
            We focus on the three things that decide whether a nearby patient finds your practice, trusts it and books. Your free audit checks all three, and our team can help you fix what it finds.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {AREAS.map((area) => (
            <Link
              key={area.title}
              href={area.href}
              className="card group flex flex-col p-6 transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-foreground hover:shadow-md"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                <area.Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-heading-4 text-foreground">{area.title}</h3>
              <p className="mt-2 flex-1 text-body-small text-muted-foreground">{area.detail}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-body-small font-medium text-primary-ink">
                {area.cta}
                <ButtonArrow />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
