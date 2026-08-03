"use client";

import { IconCalendarCheck, IconMapPin } from "@/components/icons";

export default function ReviewOptions() {
  const options = [
    {
      Icon: IconCalendarCheck,
      title: "Online Audit Review",
      description: "A 15-minute screen-share call with a specialist to review the top visibility issues, site speed bottlenecks, and review response rates discovered in your audit.",
      details: [
        "15-minute focused screen share",
        "100% remote online meeting",
        "Live comparison with local competitors",
      ],
      ctaText: "Book Online Review",
      ctaHref: "/book-consultation",
    },
    {
      Icon: IconMapPin,
      title: "In-Person Clinic Visit",
      description: "Request an in-office walkthrough where we review map searches live with your practice manager and present recommendations directly to your team.",
      details: [
        "Subject to clinic location and specialist availability",
        "Detailed local competition lookup",
        "Tailored patient acquisition walkthrough",
      ],
      ctaText: "Request In-Person Visit",
      ctaHref: "/book-consultation?type=in-person",
    },
  ];

  return (
    <section id="review-options" className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            CONSULTATION OPTIONS
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Two ways to review your practice gaps.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            Get clarity on your local visibility findings with recommendations tailored to your clinic&apos;s ZIP code.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {options.map((opt) => (
            <div
              key={opt.title}
              className="flex flex-col rounded-2xl border border-border bg-background p-8 shadow-sm justify-between"
            >
              <div>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-primary">
                  <opt.Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-6 text-heading-2 font-semibold text-foreground">{opt.title}</h3>
                <p className="mt-4 text-body text-muted-foreground leading-relaxed">
                  {opt.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {opt.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-3 text-body-small text-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4">
                <a
                  href={opt.ctaHref}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-body text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {opt.ctaText}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
