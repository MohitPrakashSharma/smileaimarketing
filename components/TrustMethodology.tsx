"use client";

import { IconCheck } from "@/components/icons";

export default function TrustMethodology() {
  const points = [
    {
      title: "Publicly Available Data",
      description: "Our scripts crawl search engine results, public directory listings, and page loading speed metrics. No private credentials required.",
    },
    {
      title: "No Google Account Link Required",
      description: "You do not need to link your Google Business Profile or grant us any administrative access to run the initial visibility scan.",
    },
    {
      title: "Prioritized Action List",
      description: "We filter out minor warnings and only present high-impact issues that directly affect whether local patients can find you and book a call.",
    },
    {
      title: "Data Freshness Guaranteed",
      description: "Every audit contains a timestamp indicating exactly when the search rankings and page speeds were simulated.",
    },
    {
      title: "Full Privacy Control",
      description: "Your practice details are processed strictly in accordance with local compliance standards. You can remove your records instantly at any time.",
    },
  ];

  return (
    <section id="trust-methodology" className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            OUR PRINCIPLES
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Built on transparency. Not hype.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            We deliver realistic estimates based on local search metrics. We do not manufacture artificial scores, use fake customer logos, or make unrealistic revenue promises.
          </p>
        </div>

        <div className="mt-12 mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <div className="space-y-6">
            {points.map((p) => (
              <div key={p.title} className="flex gap-4">
                <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h3 className="text-body font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-1.5 text-body-small text-muted-foreground leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
