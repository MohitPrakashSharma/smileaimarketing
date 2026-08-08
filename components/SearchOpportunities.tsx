"use client";

import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";

const DEMAND_LEVEL = { Low: 1, Medium: 2, High: 3 } as const;
type Demand = keyof typeof DEMAND_LEVEL;

const SEARCHES: { term: string; demand: Demand; position: string; opportunity: string }[] = [
  { term: "dentist near me", demand: "High", position: "#6", opportunity: "Top local positions" },
  { term: "emergency dentist Chicago", demand: "High", position: "#11", opportunity: "Page 1 potential" },
  { term: "dental implants Chicago", demand: "Medium", position: "#9", opportunity: "Strengthen ranking" },
  { term: "invisalign dentist Chicago", demand: "Medium", position: "Not ranking", opportunity: "New visibility opportunity" },
];

function DemandIndicator({ demand }: { demand: Demand }) {
  const filled = DEMAND_LEVEL[demand];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-3.5 w-1.5 rounded-full ${i <= filled ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </span>
      <span className="text-body-small text-muted-foreground">{demand}</span>
    </span>
  );
}

export default function SearchOpportunities() {
  return (
    <section id="search-opportunities" className="border-t border-border bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            PATIENT SEARCH DEMAND
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Searches worth paying attention to.
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            You don&apos;t need to rank for every dental keyword. We highlight the searches that matter most based on patient intent and your local market.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border border-border shadow-sm">
          {/* Desktop table */}
          <table className="hidden w-full border-collapse sm:table">
            <thead>
              <tr className="border-b border-border bg-surface-muted/50 text-left">
                <th scope="col" className="px-6 py-3 text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Patient Search</th>
                <th scope="col" className="px-6 py-3 text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Search Demand</th>
                <th scope="col" className="px-6 py-3 text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Current Position</th>
                <th scope="col" className="px-6 py-3 text-metadata font-semibold uppercase tracking-wider text-muted-foreground">Opportunity</th>
              </tr>
            </thead>
            <motion.tbody
              className="divide-y divide-border bg-white"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            >
              {SEARCHES.map((row) => (
                <motion.tr key={row.term} variants={revealItem}>
                  <td className="px-6 py-4 text-body-small font-semibold text-foreground">&ldquo;{row.term}&rdquo;</td>
                  <td className="px-6 py-4"><DemandIndicator demand={row.demand} /></td>
                  <td className="px-6 py-4 text-body-small text-muted-foreground">{row.position}</td>
                  <td className="px-6 py-4 text-body-small font-medium text-primary">{row.opportunity}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>

          {/* Mobile stacked cards */}
          <RevealGroup className="divide-y divide-border bg-white sm:hidden" stagger={0.08}>
            {SEARCHES.map((row) => (
              <motion.div key={row.term} variants={revealItem} className="space-y-2.5 p-5">
                <p className="text-body-small font-semibold text-foreground">&ldquo;{row.term}&rdquo;</p>
                <div className="flex items-center justify-between text-metadata">
                  <span className="text-muted-foreground">Search demand</span>
                  <DemandIndicator demand={row.demand} />
                </div>
                <div className="flex items-center justify-between text-metadata">
                  <span className="text-muted-foreground">Current position</span>
                  <span className="text-foreground">{row.position}</span>
                </div>
                <div className="flex items-center justify-between text-metadata">
                  <span className="text-muted-foreground">Opportunity</span>
                  <span className="font-medium text-primary">{row.opportunity}</span>
                </div>
              </motion.div>
            ))}
          </RevealGroup>
        </div>

        <Reveal delay={0.15} className="mx-auto mt-6 max-w-2xl text-center">
          <p className="text-metadata text-muted-foreground">Sample data — your report reflects searches specific to your practice and city.</p>
        </Reveal>
      </div>
    </section>
  );
}
