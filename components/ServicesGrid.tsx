import { IconMapPin, IconStorefront, IconMonitor, IconUsers, IconCheck } from "@/components/icons";
import Eyebrow from "@/components/Eyebrow";

const SERVICES = [
  {
    Icon: IconMapPin,
    title: "Local SEO",
    copy: "Rank higher for “dentist near me” and searches specific to your city and services.",
  },
  {
    Icon: IconStorefront,
    title: "Google Business Profile",
    copy: "A fully optimised profile — photos, hours, services, and posts — kept accurate and active.",
  },
  {
    Icon: IconMonitor,
    title: "Dental website optimisation",
    copy: "Fast, mobile-first pages built to turn visitors into calls and booking requests.",
  },
  {
    Icon: IconUsers,
    title: "Patient lead generation",
    copy: "Targeted local campaigns that bring in enquiries from patients ready to book.",
  },
];

const CHECKLIST = [
  "Google Business Profile setup and ongoing optimisation",
  "Local SEO for map-pack and search rankings",
  "Website conversion review and fixes",
  "Call, form, and message tracking",
  "Review generation and response support",
  "Monthly plain-English reporting",
  "Direct access to the person doing the work",
  "Month-to-month — no long-term lock-in",
];

const BENEFITS = [
  {
    title: "Dental-only focus",
    copy: "Every recommendation is built around how patients actually search for a dentist — not generic local-business advice.",
  },
  {
    title: "Full transparency",
    copy: "You see exactly what's being done, and why, every month.",
  },
  {
    title: "No long-term lock-in",
    copy: "Stay because it's working, not because of a contract.",
  },
];

export default function ServicesGrid() {
  return (
    <section id="services" className="mx-auto max-w-[1200px] px-6 py-20 sm:px-8 sm:py-28">
      <div className="max-w-xl">
        <Eyebrow>What we run</Eyebrow>
        <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-[2.5rem]">
          Four pillars, one team managing all of them.
        </h2>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICES.map((service) => (
          <div
            key={service.title}
            className="group rounded-2xl border border-line bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-teal/40 hover:shadow-[0_20px_40px_-24px_rgba(8,44,58,0.25)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mist text-teal-deep transition-colors group-hover:bg-teal group-hover:text-white">
              <service.Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 font-display text-lg font-medium text-ink">{service.title}</h3>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-slate">
              {service.copy}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-20 rounded-3xl border border-line bg-mist/50 p-8 sm:p-12">
        <h3 className="font-display text-2xl font-medium text-ink">What&apos;s included, every month.</h3>
        <div className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
          {CHECKLIST.map((item) => (
            <div key={item} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal/15 text-teal-deep">
                <IconCheck className="h-3.5 w-3.5" />
              </span>
              <p className="font-body text-[14.5px] leading-snug text-ink">{item}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className="rounded-2xl bg-white p-5">
              <p className="font-body text-[15px] font-semibold text-ink">{benefit.title}</p>
              <p className="mt-1.5 font-body text-[13.5px] leading-relaxed text-slate">
                {benefit.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
