"use client";

import { IconMapPinOff, IconStar, IconClock } from "@/components/icons";

const PAINS = [
  {
    Icon: IconMapPinOff,
    title: "Patients can't find you when it counts",
    detail: "Right when someone nearby is ready to book, your practice may not even show up in their search.",
  },
  {
    Icon: IconStar,
    title: "Another practice looks like the safer bet",
    detail: "More reviews and a stronger profile can make a nearby competitor feel like the obvious choice — even when your care is just as good, or better.",
  },
  {
    Icon: IconClock,
    title: "Booking isn't as easy as it should be",
    detail: "If a patient can't call or book you in a couple of taps on their phone, most will simply move to the next name on the list.",
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
            Where most practices quietly lose patients.
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
