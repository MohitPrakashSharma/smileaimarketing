"use client";

import { IconMapPin, IconMonitor, IconStar, IconTrendingUp, IconCheck } from "@/components/icons";

export default function AuditCoverage() {
  const coverage = [
    {
      Icon: IconMapPin,
      title: "Local Search Visibility",
      checks: [
        "Google Map pack position for high-intent keywords.",
        "Listing details consistency across major directories.",
        "ZIP code search rank simulation.",
      ],
    },
    {
      Icon: IconMonitor,
      title: "Website Experience",
      checks: [
        "Mobile loading speeds and layout stability.",
        "Presence of clear phone and online booking targets.",
        "Responsive alignment on popular phone displays.",
      ],
    },
    {
      Icon: IconStar,
      title: "Reviews and Reputation",
      checks: [
        "Average rating score and review count momentum.",
        "Response rate and timeframe patterns.",
        "Trust signals that influence click rates.",
      ],
    },
    {
      Icon: IconTrendingUp,
      title: "Competitor Positioning",
      checks: [
        "Primary search term rankings of top 3 local clinics.",
        "Gaps in local keyword optimization.",
        "Patient convenience factors comparison.",
      ],
    },
  ];

  return (
    <section id="audit-coverage" className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            AUDIT SCOPE
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            What our algorithm checks.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            Our automated audit scans public records and tests page performance against core B2B growth benchmarks.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {coverage.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-background p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-primary">
                <item.Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-heading-3 font-semibold text-foreground">{item.title}</h3>
              <ul className="mt-4 space-y-3">
                {item.checks.map((check) => (
                  <li key={check} className="flex items-start gap-2.5">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <IconCheck className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-body-small text-muted-foreground leading-snug">{check}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
