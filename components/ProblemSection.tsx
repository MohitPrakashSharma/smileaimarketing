"use client";

import { IconMapPinOff, IconStar, IconClock } from "@/components/icons";

const PAINS = [
  {
    Icon: IconMapPinOff,
    title: "Hard to find locally",
    detail: "Your practice may not appear when nearby patients are ready to book.",
  },
  {
    Icon: IconStar,
    title: "Competitors look more trusted",
    detail: "Stronger reviews and profiles can make another clinic feel like the safer choice.",
  },
  {
    Icon: IconClock,
    title: "Booking takes too much effort",
    detail: "Mobile visitors leave when calling or booking is not quick and obvious.",
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
            Where practices lose new patients.
          </h2>
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
