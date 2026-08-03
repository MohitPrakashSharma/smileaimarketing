"use client";

import { IconMapPin, IconMonitor, IconStar, IconTrendingUp } from "@/components/icons";

export default function SampleAuditPreview() {
  const handleScrollToHero = () => {
    const heroSection = document.getElementById("top");
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const metrics = [
    {
      Icon: IconMapPin,
      label: "Local Search Visibility",
      value: "42/100",
      status: "Poor",
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      Icon: IconMonitor,
      label: "Website Experience",
      value: "61/100",
      status: "Average",
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    {
      Icon: IconStar,
      label: "Google Map Position",
      value: "7th",
      status: "Buried",
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
    {
      Icon: IconTrendingUp,
      label: "Competitors Ahead",
      value: "3",
      status: "High Gap",
      color: "text-rose-600 bg-rose-50 border-rose-100",
    },
  ];

  const actions = [
    "Fix 3 inconsistent Google Maps address details causing search penalties.",
    "Compress large images to speed up page load on mobile devices.",
    "Add an online booking button above the fold to capture mobile visitors.",
  ];

  return (
    <section id="sample-audit" className="border-t border-border bg-white scroll-mt-16">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            SAMPLE AUDIT PREVIEW
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            What your free report looks like.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            A clear checklist of your local competitive gaps, website response speeds, and map optimization issues.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-background shadow-md">
          {/* Header Panel */}
          <div className="flex flex-col gap-4 border-b border-border bg-surface px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-body font-semibold text-foreground">Metro Dental Care</span>
              </div>
              <span className="text-metadata">Chicago, IL</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-metadata uppercase tracking-wider font-semibold">OPPORTUNITY LEVEL</span>
              <span className="rounded bg-rose-100 px-2 py-0.5 font-label text-xs font-bold text-rose-700">
                HIGH
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="bg-surface p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-primary">
                  <m.Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-metadata font-medium text-muted-foreground">{m.label}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-display font-bold text-foreground">{m.value}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-metadata font-semibold ${m.color}`}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Prioritized Actions */}
          <div className="border-t border-border bg-surface p-6 sm:p-8">
            <h3 className="text-heading-3 font-semibold text-foreground">Top 3 Recommended Actions</h3>
            <ol className="mt-6 space-y-4">
              {actions.map((action, index) => (
                <li key={index} className="flex items-start gap-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-body text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="text-body text-foreground leading-relaxed">{action}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={handleScrollToHero}
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-body text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Run This Audit for My Clinic
          </button>
        </div>
      </div>
    </section>
  );
}
