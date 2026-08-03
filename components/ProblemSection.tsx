"use client";

import { IconMapPinOff, IconStar, IconClock } from "@/components/icons";

const PAINS = [
  {
    Icon: IconMapPinOff,
    title: "Low local search visibility",
    detail: "Your clinic is missing from Google Map packs when nearby patients search for local dental services.",
  },
  {
    Icon: IconStar,
    title: "Weak review signals",
    detail: "Nearby dental practices show higher star ratings and consistent patient reviews, capturing local trust first.",
  },
  {
    Icon: IconClock,
    title: "No instant online booking",
    detail: "High-intent website visitors bounce to other clinics because they cannot instantly request or book visits on mobile.",
  },
];

export default function ProblemSection() {
  return (
    <section id="problems" className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            THE REALITY
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Why local clinics lose patients before they call.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            If your digital presence is buried or slow, local patients choose competitors without ever contacting you.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PAINS.map((pain) => (
            <div
              key={pain.title}
              className="rounded-2xl border border-border bg-background p-6 shadow-sm"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-primary">
                <pain.Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-heading-3 font-semibold text-foreground">{pain.title}</h3>
              <p className="mt-3 text-body-small text-muted-foreground leading-relaxed">
                {pain.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
