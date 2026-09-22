"use client";

import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { cap, type IndustryProfile } from "@/lib/industry";
import { buildBriefing, type BriefingFinding } from "@/lib/audit/view/briefing";
import type { PerfRow } from "@/lib/audit/view/performanceView";
import { consultationUrl } from "@/lib/audit/technicalReport";
import GoogleScoresStrip from "./GoogleScoresStrip";
import LocalComparisonSection from "./LocalComparisonSection";
import OpportunitySection from "./OpportunitySection";
import type { LocalComparison, LocalComparisonState } from "@/lib/audit/competitors/types";
import { LocalComparisonPending, LocalComparisonUnavailable } from "./LocalComparisonStatus";
import type { OpportunityScenario } from "@/lib/audit/opportunity/types";
import type { FindingView } from "./findingTypes";
import DownloadPdfButton from "./DownloadPdfButton";
import RequestTechnicalReportLink from "./RequestTechnicalReportLink";

/**
 * The v2 customer report — a business briefing, not a technical dump:
 *
 *   A  Executive briefing        headline, ≤60-word summary, four numbers,
 *                                 Google's PageSpeed rings for the homepage
 *   B  Your three biggest problems   evidence → implication → action, one line each
 *   C  What could this be worth?     the automated opportunity scenario
 *   D  Your local competitors        verified side-by-side measurements
 *   E  Your next three actions
 *   F  One closing consultation CTA
 *
 * Sections A, B and E come from `buildBriefing`, the same function the
 * customer PDF calls, so the two documents always state the same headline,
 * summary, problems, counts and actions. Full evidence — every affected URL,
 * developer instruction and raw measurement — stays in the restricted
 * technical report, which is unchanged and still requested by hand.
 */

export type V2Scores = { overall: number | null; technical: number | null; content: number | null; performance: number | null; search: number | null; local: number | null };

export type V2ReportData = {
  business: { name: string; website: string; city: string };
  checkedAtLabel: string;
  headline: { line1: string; line2: string };
  dek: string;
  summary: string | null;
  scores: V2Scores | null;
  severityCounts: Record<string, number>;
  crawlStats: { pagesCrawled?: number; pagesDiscovered?: number; budgetHit?: string } | null;
  findings: FindingView[];
  performance: PerfRow[];
  checksRun: number;
  stageStatus?: string;
  stageDetail?: string;
  /** Local competitor comparison — null means nothing verified to show. */
  comparison?: LocalComparison | null;
  /** Where the comparison stands: pending shows progress, unavailable a short note, none nothing. */
  comparisonState?: LocalComparisonState | null;
  /** Financial-opportunity scenario built server-side (the same object the PDF prints). */
  opportunity?: OpportunityScenario | null;
};

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-danger/10 text-danger",
  MEDIUM: "bg-warning/15 text-[var(--color-status-opportunity-fg)]",
  LOW: "bg-surface-muted text-muted-foreground",
  OPPORTUNITY: "bg-accent-soft text-primary",
};

const toBriefingFinding = (f: FindingView): BriefingFinding => ({
  id: f.id,
  title: f.title,
  pillar: f.pillar,
  severity: f.severity,
  bucket: f.bucket,
  owner: f.owner,
  effort: f.effort,
  affectedPageCount: f.affectedPageCount,
  detectedValue: f.detectedValue,
  developerDetails: f.developerDetails,
  recommendedFix: f.recommendedFix,
  whyItMatters: f.whyItMatters,
  device: f.device,
});

function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  return (
    <div className="rounded-[var(--radius-medium)] border border-white/10 bg-white/5 px-4 py-3">
      <p className="font-display text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-white">{value}</p>
      <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wider text-white/70">{label}</p>
      {note && <p className="text-[11px] leading-snug text-white/55">{note}</p>}
    </div>
  );
}

export default function V2Report({ data, ind, publicToken }: { data: V2ReportData; ind: IndustryProfile; publicToken: string }) {
  const { business, scores, findings } = data;
  const pagesCrawled = data.crawlStats?.pagesCrawled ?? 0;
  const briefing = buildBriefing({
    business,
    scores: scores ? { overall: scores.overall, performance: scores.performance } : null,
    severityCounts: data.severityCounts,
    findings: findings.map(toBriefingFinding),
    pagesCrawled,
    checksRun: data.checksRun,
  });
  const { stats } = briefing;

  return (
    <div className="space-y-6">
      {/* A ── Executive briefing ─────────────────────────────────────────── */}
      <section id="overview" aria-labelledby="overview-heading" className="band-dark overflow-hidden rounded-2xl p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-metadata">
          <span>
            <span className="font-bold uppercase tracking-wider text-white/60">{cap(ind.business)} </span>
            <span className="font-semibold text-white">{business.name}</span>
            {business.city && <span className="text-white/60"> · {business.city}</span>}
          </span>
          <span>
            <span className="font-bold uppercase tracking-wider text-white/60">Audited </span>
            <span className="font-semibold text-white">{data.checkedAtLabel}</span>
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="min-w-0 max-w-2xl">
            <p className="text-eyebrow text-white/60">Executive briefing</p>
            <h1 id="overview-heading" className="mt-2 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-[-0.02em] text-white sm:text-[2.25rem]">
              {briefing.headline}
            </h1>
            <p className="mt-4 text-body leading-relaxed text-white/85">{briefing.summary}</p>
            {!briefing.performanceMeasured && (
              <p className="mt-3 text-metadata text-white/60">Google PageSpeed could not test this site during the audit, so speed is not scored here.</p>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col items-start gap-1 lg:w-auto lg:items-end">
            <DownloadPdfButton publicToken={publicToken} className="w-full lg:w-auto" />
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat value={stats.score === null ? "—" : `${stats.score}`} label="Audit score" note="out of 100" />
          <Stat value={String(stats.findings)} label="Verified issues" note={`from ${stats.checksRun} checks`} />
          <Stat value={String(stats.criticalHigh)} label="Critical & high" note={`${stats.critical} critical · ${stats.high} high`} />
          <Stat value={String(stats.pagesCrawled)} label="Pages crawled" note={data.crawlStats?.budgetHit && data.crawlStats.budgetHit !== "none" ? "crawl budget reached" : "full crawl"} />
        </dl>
      </section>

      {/* A2 ── Google's own scores for the homepage (only when measured) ─── */}
      <GoogleScoresStrip rows={data.performance} />

      {/* B ── Your three biggest website problems ────────────────────────── */}
      {briefing.problems.length > 0 && (
        <section id="problems" aria-labelledby="problems-heading" className="space-y-3">
          <div className="px-1">
            <h2 id="problems-heading" className="text-heading-2 text-foreground">Your {briefing.problems.length === 1 ? "biggest website problem" : `${briefing.problems.length} biggest website problems`}</h2>
            <p className="mt-1 text-body-small text-muted-foreground">Verified on your own pages — what we measured, what it can mean and what to do.</p>
          </div>
          <ol className="space-y-3">
            {briefing.problems.map((p, i) => (
              <li key={p.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-4">
                  <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-body font-bold text-primary sm:flex">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLE[p.severity] ?? SEVERITY_STYLE.LOW}`}>{p.severityLabel}</span>
                      <span className="text-[11px] text-muted-foreground">{p.area} · {p.ownerLabel}</span>
                    </div>
                    <h3 className="mt-2 font-display text-[1.25rem] font-bold leading-snug tracking-[-0.01em] text-foreground sm:text-[1.375rem]">{p.headline}</h3>
                    <dl className="mt-3 space-y-1.5 text-body-small">
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-semibold text-foreground">Measured:</dt>
                        <dd className="min-w-0 flex-1 text-foreground">{p.evidence}</dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-semibold text-foreground">What it can mean:</dt>
                        <dd className="min-w-0 flex-1 text-muted-foreground">{p.implication}</dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="font-semibold text-foreground">Do this:</dt>
                        <dd className="min-w-0 flex-1 text-foreground">{p.action}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {briefing.more.total > 0 && (
            <div className="rounded-2xl border border-border bg-surface px-5 py-4 shadow-sm sm:px-6">
              <p className="text-body-small text-foreground">
                <span className="font-semibold">Also found: {briefing.more.total} further finding{briefing.more.total === 1 ? "" : "s"}</span>
                <span className="text-muted-foreground"> — {briefing.more.byArea.map((a) => `${a.count} ${a.label.toLowerCase()}`).join(", ")}.</span>
              </p>
              {briefing.more.titles.length > 0 && (
                <p className="mt-1 text-metadata text-muted-foreground">
                  Including: {briefing.more.titles.join("; ")}{briefing.more.total > briefing.more.titles.length ? "; and more" : ""}. Every one is listed with its full evidence in the technical report.
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* C ── What could these problems be worth? ────────────────────────── */}
      {data.opportunity && <OpportunitySection scenario={data.opportunity} publicToken={publicToken} businessName={business.name} />}

      {/* D ── Your local competitors ─────────────────────────────────────── */}
      {data.comparison && <LocalComparisonSection comparison={data.comparison} publicToken={publicToken} />}
      {!data.comparison && data.comparisonState?.state === "pending" && <LocalComparisonPending />}
      {!data.comparison && data.comparisonState?.state === "unavailable" && <LocalComparisonUnavailable reason={data.comparisonState.reason} />}

      {/* E ── Your next three actions ────────────────────────────────────── */}
      {briefing.actions.length > 0 && (
        <section id="next-actions" aria-labelledby="actions-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
          <h2 id="actions-heading" className="text-heading-2 text-foreground">Your next {briefing.actions.length === 1 ? "action" : `${briefing.actions.length} actions`}</h2>
          <p className="mt-1 text-body-small text-muted-foreground">Start at the top. Each one comes straight from a verified finding above.</p>
          <ol className="mt-5 divide-y divide-border-subtle border-t border-border">
            {briefing.actions.map((a, i) => (
              <li key={`${a.title}-${i}`} className="flex items-start gap-4 py-4">
                <span className="font-display text-[1.5rem] font-bold leading-none tracking-[-0.02em] text-primary">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body font-bold text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-body-small text-muted-foreground">{a.detail}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.LOW}`}>{a.severityLabel}</span>
                  {a.whenLabel && <span className="text-[11px] text-muted-foreground">{a.whenLabel}</span>}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-metadata text-muted-foreground">
            Severity is the audit&apos;s own rating of each finding. Fixing these addresses what we measured; it is not a promise of rankings, enquiries or revenue.
          </p>
        </section>
      )}

      {/* F ── Consultation CTA ───────────────────────────────────────────── */}
      <section id="consultation-cta" aria-labelledby="cta-heading" className="band-dark overflow-hidden rounded-2xl p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 id="cta-heading" className="font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-[-0.02em] text-white sm:text-[2rem]">
              Find Out What&apos;s Holding Your Practice Back
            </h2>
            <p className="mt-3 text-body text-white/80">
              We&apos;ll walk you through the findings, explain the opportunities and help you decide which improvements to prioritise.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            <a href={consultationUrl("", publicToken)} className={buttonClasses({ variant: "light" })}>
              <span>Book your website review</span>
              <ButtonArrow />
            </a>
            <RequestTechnicalReportLink publicToken={publicToken} className="lg:items-end lg:text-right" />
          </div>
        </div>
      </section>
    </div>
  );
}
