"use client";

import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";

const PRACTICES = [
  { key: "you", name: "Your Practice", highlight: true },
  { key: "a", name: "Nearby Practice A", highlight: false },
  { key: "b", name: "Nearby Practice B", highlight: false },
  { key: "c", name: "Nearby Practice C", highlight: false },
] as const;

const METRICS: {
  label: string;
  unit: string;
  max: number;
  values: Record<(typeof PRACTICES)[number]["key"], number>;
}[] = [
  { label: "Local Search Visibility", unit: "/100", max: 100, values: { you: 42, a: 71, b: 65, c: 58 } },
  { label: "Review Rating", unit: "/5", max: 5, values: { you: 4.6, a: 4.8, b: 4.3, c: 4.5 } },
  { label: "Booking Ease", unit: "/100", max: 100, values: { you: 54, a: 80, b: 62, c: 70 } },
];

export default function CompetitorComparison() {
  return (
    <section id="competitor-comparison" className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            LOCAL COMPARISON
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            See how your practice compares locally.
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border bg-white p-6 shadow-sm sm:p-8">
          <RevealGroup className="space-y-8" stagger={0.1}>
            {METRICS.map((metric) => (
              <motion.div key={metric.label} variants={revealItem}>
                <p className="text-body-small font-semibold text-foreground">{metric.label}</p>
                <div className="mt-3 space-y-2.5">
                  {PRACTICES.map((p) => {
                    const value = metric.values[p.key];
                    const pct = Math.min(100, (value / metric.max) * 100);
                    return (
                      <div key={p.key} className="flex items-center gap-3">
                        <span
                          className={`w-36 shrink-0 text-metadata sm:w-40 ${
                            p.highlight ? "font-bold text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {p.name}
                        </span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
                          <motion.div
                            className={`h-full rounded-full ${p.highlight ? "bg-primary" : "bg-slate-300"}`}
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                        <span
                          className={`w-12 shrink-0 text-right text-metadata font-semibold ${
                            p.highlight ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {value}{metric.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>

        <Reveal delay={0.15} className="mx-auto mt-8 max-w-2xl text-center">
          <p className="text-body text-muted-foreground">
            Your reputation is already competitive. Most of the current gap comes from local search visibility and the booking experience.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
