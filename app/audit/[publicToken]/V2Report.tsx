"use client";

import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { CONTACT } from "@/lib/siteConfig";
import { cap, type IndustryProfile } from "@/lib/industry";
import { buildBriefing, type BriefingFinding } from "@/lib/audit/view/briefing";
import type { PerfRow } from "@/lib/audit/view/performanceView";
import { consultationUrl } from "@/lib/audit/technicalReport";
import GoogleScoresStrip from "./GoogleScoresStrip";
import StoryCard from "./StoryCard";
import LocalComparisonSection from "./LocalComparisonSection";
import OpportunitySection from "./OpportunitySection";
import type { LocalComparison, LocalComparisonState } from "@/lib/audit/competitors/types";
import { LocalComparisonPending, LocalComparisonUnavailable } from "./LocalComparisonStatus";
import type { OpportunityScenario } from "@/lib/audit/opportunity/types";
import type { FindingView } from "./findingTypes";
import DownloadPdfButton from "./DownloadPdfButton";
import RequestTechnicalReportLink from "./RequestTechnicalReportLink";

/**
 * The v2 customer report — an editorial briefing, read top to bottom:
 *
 *   Cover     the headline, the numbers, Google's PageSpeed rings
 *   Stories   one per verified problem: measured chip, what's happening,
 *             how to fix it, what the fix is measured against
 *   Worth     the automated opportunity scenario
 *   Nearby    the verified competitor comparison
 *   Next      the three actions, then a direct line to us (phone, email)
 *
 * There is no form on this page: a practice owner who wants to talk should be
 * able to call or email in one tap. The same briefing builder feeds the
 * customer PDF, so the two documents always read the same.
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
  findingKey: f.findingKey,
  expectedValue: f.expectedValue,
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
      {/* Cover ───────────────────────────────────────────────────────────── */}
      <section id="overview" aria-labelledby="overview-heading" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-4 bg-background-dark px-5 py-2.5 sm:px-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">Website report · {data.checkedAtLabel}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-on-dark">Executive briefing</span>
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-foreground pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary-ink">Exclusive briefing</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
              For {business.name}{business.city ? ` — ${business.city}` : ""} · {cap(ind.business)}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 id="overview-heading" className="font-display text-[2rem] font-extrabold leading-[1.04] tracking-[-0.025em] text-foreground sm:text-[3rem]">
                {stats.findings === 0 ? "No Blocking Problems." : `${stats.findings} Verified Problems.`}{" "}
                {stats.score === null ? "Your Site Was Not Scored." : `Your Site Scores ${stats.score}/100.`}{" "}
                <span className="bg-accent-soft box-decoration-clone px-1">{stats.findings === 0 ? "Here's What We Checked." : "Here's What To Fix First."}</span>
              </h1>
              <p className="mt-4 max-w-3xl font-copy text-body-large italic text-foreground">{briefing.summary}</p>
              {!briefing.performanceMeasured && (
                <p className="mt-2 text-metadata text-muted-foreground">Google PageSpeed could not test this site during the audit, so speed is not scored here.</p>
              )}
            </div>
            <div className="shrink-0">
              <DownloadPdfButton publicToken={publicToken} className="w-full lg:w-auto" />
            </div>
          </div>

          <div className="mt-8 grid gap-x-10 gap-y-7 border-t-2 border-foreground pt-6 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">By the numbers</p>
              <dl className="mt-3 space-y-2.5">
                {[
                  [stats.score === null ? "—" : `${stats.score}/100`, "website health score"],
                  [String(stats.findings), "verified problems"],
                  [String(stats.criticalHigh), `critical & high (${stats.critical} critical)`],
                  [String(stats.pagesCrawled), "pages crawled"],
                ].map(([v, label]) => (
                  <div key={label} className="flex items-baseline gap-3">
                    <dd className="font-display text-[1.5rem] font-bold leading-none tracking-[-0.02em] text-primary">{v}</dd>
                    <dt className="font-copy text-body-small italic text-foreground">{label}</dt>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-foreground">Inside this report</p>
              <ol className="mt-3 space-y-1.5 text-body-small">
                {[
                  ...briefing.problems.map((p, i) => ({ href: `#story-${i + 1}`, num: String(i + 1).padStart(2, "0"), label: p.storyHeadline })),
                  { href: "#local-comparison", num: "", label: "How you compare with nearby practices." },
                  { href: "#opportunity", num: "", label: "How much business you could be losing without realizing it." },
                  { href: "#next", num: "", label: "Your next moves, and how to reach us." },
                ].map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="flex items-baseline gap-2 border-l-[3px] border-primary bg-accent-soft px-3 py-2 font-semibold text-foreground transition-colors duration-[var(--duration-fast)] hover:bg-primary hover:text-white"
                    >
                      {item.num && <span className="font-display text-[0.8125rem] font-bold text-primary-ink group-hover:text-white">{item.num}</span>}
                      <span className="min-w-0">{item.label}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {briefing.more.total > 0 && (
            <p className="mt-6 text-body-small text-muted-foreground">
              <span className="font-semibold text-foreground">Also found: {briefing.more.total} further finding{briefing.more.total === 1 ? "" : "s"}</span> — {briefing.more.byArea.map((a) => `${a.count} ${a.label.toLowerCase()}`).join(", ")}.
              {briefing.more.titles.length > 0 && ` Including: ${briefing.more.titles.join("; ")}${briefing.more.total > briefing.more.titles.length ? "; and more" : ""}. Every one is listed with its full evidence in the technical report.`}
            </p>
          )}
        </div>
      </section>

      {/* A2 ── Google's own scores for the homepage (only when measured) ─── */}
      <GoogleScoresStrip rows={data.performance} />

      {/* Stories — one page per verified problem ────────────────────────── */}
      {briefing.problems.map((p, i) => (
        <StoryCard key={p.id} problem={p} index={i} total={briefing.problems.length} />
      ))}

      {/* C ── What could these problems be worth? ────────────────────────── */}
      {data.opportunity && <OpportunitySection scenario={data.opportunity} publicToken={publicToken} businessName={business.name} />}

      {/* D ── Your local competitors ─────────────────────────────────────── */}
      {data.comparison && <LocalComparisonSection comparison={data.comparison} publicToken={publicToken} />}
      {!data.comparison && data.comparisonState?.state === "pending" && <LocalComparisonPending />}
      {!data.comparison && data.comparisonState?.state === "unavailable" && <LocalComparisonUnavailable reason={data.comparisonState.reason} />}

      {/* Next moves + a direct line to a person ─────────────────────────── */}
      <section id="next" aria-labelledby="next-heading" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-4 bg-background-dark px-5 py-2.5 sm:px-8">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white">What to do next</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-accent-on-dark">Talk to us</span>
        </div>

        <div className="p-5 sm:p-8">
          {briefing.actions.length > 0 && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b-2 border-foreground pb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary-ink">Your next moves</span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">{briefing.actions.length} action{briefing.actions.length === 1 ? "" : "s"}, in order</span>
              </div>
              <h2 id="next-heading" className="mt-5 font-display text-[1.75rem] font-extrabold leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[2.5rem]">
                Start Here. <span className="bg-accent-soft box-decoration-clone px-1">We&apos;ll Do The Rest With You.</span>
              </h2>
              <ol className="mt-6 divide-y divide-border-subtle border-t border-border">
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
            </>
          )}

          {/* One tap to a person — no form on this page */}
          <div className="mt-8 rounded-[var(--radius-large)] border-l-4 border border-primary bg-accent-soft p-5 sm:p-7">
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-ink">Talk to a human about this report</p>
            <p className="mt-2 max-w-2xl text-body text-foreground">
              Call or email us and we&apos;ll walk you through the findings, explain the opportunities and help you decide what to fix first. Fifteen minutes, no pitch.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
              <a href={CONTACT.phone.href} className="font-display text-[1.75rem] font-extrabold leading-none tracking-[-0.02em] text-foreground hover:text-primary sm:text-[2.25rem]">
                {CONTACT.phone.display}
              </a>
              <a href={`mailto:${CONTACT.email}`} className="text-body font-semibold text-primary-ink underline-offset-4 hover:underline">
                {CONTACT.email}
              </a>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <a href={consultationUrl("", publicToken)} className={buttonClasses()}>
                <span>Or book a 15-minute review</span>
                <ButtonArrow />
              </a>
              <RequestTechnicalReportLink publicToken={publicToken} />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
