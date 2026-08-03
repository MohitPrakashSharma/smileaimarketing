"use client";

import { IconCheck } from "@/components/icons";

export default function CompetitorComparison() {
  const competitors = [
    {
      name: "Your Clinic (Example)",
      visibility: "42%",
      reviews: "18 reviews",
      rating: "4.1 ★",
      speed: "61/100",
      booking: "No",
      highlight: true,
    },
    {
      name: "Competitor A",
      visibility: "88%",
      reviews: "142 reviews",
      rating: "4.8 ★",
      speed: "85/100",
      booking: "Yes",
      highlight: false,
    },
    {
      name: "Competitor B",
      visibility: "76%",
      reviews: "95 reviews",
      rating: "4.7 ★",
      speed: "74/100",
      booking: "Yes",
      highlight: false,
    },
    {
      name: "Competitor C",
      visibility: "68%",
      reviews: "110 reviews",
      rating: "4.6 ★",
      speed: "59/100",
      booking: "No",
      highlight: false,
    },
  ];

  return (
    <section id="competitor-comparison" className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            COMPETITOR GAP ANALYSIS
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            See where you rank against local clinics.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            The free audit calculates how your practice matches up across the parameters that influence Google Map pack ranking and patient bookings.
          </p>
          <p className="mt-2 text-metadata italic text-muted-foreground">
            *Values shown below are illustrative representations of typical local gaps.
          </p>
        </div>

        {/* Mobile View: Stacked list cards */}
        <div className="mt-12 space-y-4 md:hidden">
          {competitors.map((c) => (
            <div
              key={c.name}
              className={`rounded-2xl border p-5 bg-surface ${
                c.highlight ? "border-primary shadow-sm ring-1 ring-primary/20" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className={`text-body font-semibold ${c.highlight ? "text-primary" : "text-foreground"}`}>
                  {c.name}
                </span>
                {c.highlight && (
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-metadata font-bold text-primary">
                    YOUR CLINIC
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-metadata text-muted-foreground block">Search Visibility</span>
                  <span className="text-body font-semibold text-foreground">{c.visibility}</span>
                </div>
                <div>
                  <span className="text-metadata text-muted-foreground block">Patient Reviews</span>
                  <span className="text-body font-semibold text-foreground">{c.reviews} ({c.rating})</span>
                </div>
                <div>
                  <span className="text-metadata text-muted-foreground block">Web Experience</span>
                  <span className="text-body font-semibold text-foreground">{c.speed}</span>
                </div>
                <div>
                  <span className="text-metadata text-muted-foreground block">Online Booking</span>
                  <span className="text-body font-semibold text-foreground">{c.booking}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Clean Table */}
        <div className="mt-12 hidden md:block overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full border-collapse text-left text-sm text-foreground">
            <thead>
              <tr className="border-b border-border bg-background/50 font-label text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4">Clinic Name</th>
                <th className="px-6 py-4">Local Visibility</th>
                <th className="px-6 py-4">Reviews & Rating</th>
                <th className="px-6 py-4">Website Speed</th>
                <th className="px-6 py-4 text-center">Online Booking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {competitors.map((c) => (
                <tr
                  key={c.name}
                  className={`transition-colors hover:bg-background/20 ${
                    c.highlight ? "bg-primary/5 font-semibold" : ""
                  }`}
                >
                  <td className="px-6 py-4 flex items-center gap-2">
                    <span className={c.highlight ? "text-primary font-bold" : "text-foreground font-medium"}>
                      {c.name}
                    </span>
                    {c.highlight && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-metadata font-bold text-primary">
                        YOUR CLINIC
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-foreground">{c.visibility}</td>
                  <td className="px-6 py-4 text-foreground">{c.reviews} ({c.rating})</td>
                  <td className="px-6 py-4 text-foreground">{c.speed}</td>
                  <td className="px-6 py-4 text-center">
                    {c.booking === "Yes" ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <IconCheck className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
