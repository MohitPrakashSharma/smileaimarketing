"use client";

import { IconSearch, IconStar, IconMonitor, IconPhoneWave, IconUsers } from "@/components/icons";
import StatusBadge, { type StatusLevel, statusFromScore } from "@/components/ui/StatusBadge";
import { Reveal, RevealGroup, revealItem, motion } from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import Eyebrow from "@/components/Eyebrow";

const BAR_COLOR: Record<StatusLevel, string> = {
  healthy: "var(--color-status-healthy-fg)",
  opportunity: "var(--color-status-opportunity-fg)",
  attention: "var(--color-status-attention-fg)",
};

const CATEGORIES: {
  Icon: typeof IconSearch;
  label: string;
  score: number;
  explanation: string;
}[] = [
  {
    Icon: IconSearch,
    label: "Patient Discovery",
    score: 42,
    explanation: "Patients searching nearby aren't seeing your practice as often as they should.",
  },
  {
    Icon: IconStar,
    label: "Patient Trust",
    score: 78,
    explanation: "Your reviews and reputation are already working in your favour.",
  },
  {
    Icon: IconMonitor,
    label: "Website Experience",
    score: 61,
    explanation: "Your site is slower and harder to use on mobile than nearby competitors.",
  },
  {
    Icon: IconPhoneWave,
    label: "Booking Journey",
    score: 54,
    explanation: "It takes a few extra steps before a patient can request an appointment.",
  },
];

export default function SampleAuditPreview() {
  const handleScrollToAudit = () => {
    const auditSection = document.getElementById("seo-audit");
    if (auditSection) {
      auditSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="sample-audit" className="scroll-mt-[var(--header-height)] bg-background">
      <div className="container-site section-space">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">Sample audit</Eyebrow>
          <h2 className="mt-4 text-heading-2 text-foreground">
            What your audit report looks like.
          </h2>
          <p className="mt-4 text-body-large text-muted-foreground">
            A sample Practice Growth Review for a fictional Toronto clinic. Yours will use your practice&apos;s real data and follow the same journey a prospective patient takes — from searching locally to requesting an appointment.
          </p>
        </div>

        {/* Report frame */}
        <div className="card-elevated mx-auto mt-10 max-w-5xl overflow-hidden !shadow-xl">
          <div className="band-dark flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-eyebrow text-muted-foreground">Practice Growth Review</p>
              <p className="mt-1 font-display text-[1.25rem] font-semibold text-foreground">
                Metro Dental Care <span className="font-body text-body-small font-normal text-muted-foreground">— Toronto, ON</span>
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
              Sample data
            </span>
          </div>

          <RevealGroup className="grid bg-surface sm:grid-cols-2" stagger={0.08}>
            {CATEGORIES.map((c) => {
              const status = statusFromScore(c.score);
              return (
              <motion.div
                key={c.label}
                variants={revealItem}
                className="border-b border-border-subtle px-6 py-5 sm:odd:border-r"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                      <c.Icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <p className="text-heading-4 text-foreground">{c.label}</p>
                      <p className="mt-1 text-body-small text-muted-foreground">{c.explanation}</p>
                    </div>
                  </div>
                  <span className="shrink-0 font-display text-[1.5rem] font-bold leading-none tracking-[-0.02em] text-foreground">
                    {c.score}<span className="font-body text-metadata font-normal tracking-normal"> / 100</span>
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: BAR_COLOR[status] }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${c.score}%` }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <StatusBadge status={status} />
                </div>
              </motion.div>
              );
            })}

            {/* Competitive position - qualitative, no score */}
            <motion.div
              variants={revealItem}
              className="flex flex-col gap-3 bg-background-alt px-6 py-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
                  <IconUsers className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-heading-4 text-foreground">Competitive Position</p>
                  <p className="mt-1 text-body-small text-muted-foreground">
                    Nearby practices currently have an advantage in local search visibility.
                  </p>
                </div>
              </div>
              <div className="shrink-0 sm:text-right">
                <span className="font-display text-[1.5rem] font-bold tracking-[-0.02em] text-foreground">3 practices</span>
                <span className="block text-body-small text-muted-foreground sm:inline"> currently ahead</span>
              </div>
            </motion.div>
          </RevealGroup>
        </div>

        <Reveal delay={0.15} className="mt-8 text-center">
          <Button type="button" onClick={handleScrollToAudit} arrow>
            Get Your Free Website Audit
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
