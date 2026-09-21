"use client";

import ScoreGauge from "@/components/ui/ScoreGauge";
import StatusBadge, { statusFromScore } from "@/components/ui/StatusBadge";
import { IconMapPin, IconSearch, IconMonitor, IconUsers, IconTrendingUp } from "@/components/icons";
import { cap, type IndustryProfile } from "@/lib/industry";
import { measuredSummary, primaryAction, whyInBrief, type FindingLike } from "@/lib/audit/view/findingView";
import type { PerfRow } from "@/lib/audit/view/performanceView";
import { CUSTOMER_PILLARS, PILLAR_LABEL, BUCKET_LABEL, OWNER_LABEL, type PillarKey } from "@/lib/audit/view/pillars";
import GoogleChecksSection from "./GoogleChecksSection";
import LocalComparisonSection from "./LocalComparisonSection";
import OpportunitySection from "./OpportunitySection";
import CompetitorAlertCard from "./CompetitorAlertCard";
import type { LocalComparison } from "@/lib/audit/competitors/types";
import type { OpportunityScenario } from "@/lib/audit/opportunity/types";
import FindingCard, { type FindingView } from "./FindingCard";
import DownloadPdfButton from "./DownloadPdfButton";
import RequestTechnicalReportLink from "./RequestTechnicalReportLink";

/**
 * The v2 (crawler engine) report:
 *   1. Audit overview   2. Google website checks   3. Findings by area
 *   4. Action plan      4b. Local comparison (when collected) + financial opportunity calculator
 *   5. Detailed findings
 * Every number is stated once, where it belongs: the overall score in the
 * overview, pillar scores in "Findings by area", Google's scores in the
 * Google section, evidence in the findings. The SEO audit is the product;
 * Google's checks are a complement.
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
  /** Local competitor comparison — null means not collected; the section is simply omitted. */
  comparison?: LocalComparison | null;
  /** Financial-opportunity scenario built server-side (same object the PDF prints). */
  opportunity?: OpportunityScenario | null;
};

const ICONS: Record<PillarKey, typeof IconSearch> = { technical: IconMonitor, content: IconSearch, performance: IconTrendingUp, search: IconUsers, local: IconMapPin };
const PILLARS = CUSTOMER_PILLARS.map((p) => ({ ...p, Icon: ICONS[p.key] }));

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-danger/10 text-danger",
  MEDIUM: "bg-warning/15 text-[var(--color-status-opportunity-fg)]",
  LOW: "bg-surface-muted text-muted-foreground",
  OPPORTUNITY: "bg-accent-soft text-primary",
};
const toLike = (f: FindingView): FindingLike => ({ title: f.title, affectedPageCount: f.affectedPageCount, detectedValue: f.detectedValue, developerDetails: f.developerDetails, recommendedFix: f.recommendedFix, whyItMatters: f.whyItMatters, device: f.device });

function openFinding(id: string) {
  const el = document.getElementById(`finding-${id}`);
  if (el instanceof HTMLDetailsElement) el.open = true;
}

export default function V2Report({ data, ind, publicToken }: { data: V2ReportData; ind: IndustryProfile; publicToken: string }) {
  const { business, scores, findings, severityCounts } = data;
  const pagesCrawled = data.crawlStats?.pagesCrawled ?? 0;
  const overall = scores?.overall ?? null;
  const overallStatus = overall === null ? null : statusFromScore(overall);
  const measuredPillars = PILLARS.filter((p) => scores && scores[p.key] !== null);
  const strongest = measuredPillars.length > 1 ? measuredPillars.reduce((a, b) => (scores![a.key]! >= scores![b.key]! ? a : b)) : null;
  const weakest = measuredPillars.length > 1 ? measuredPillars.reduce((a, b) => (scores![a.key]! <= scores![b.key]! ? a : b)) : null;
  const actionPlan = findings.slice(0, 5);
  const perfFindings = findings.filter((f) => f.pillar === "PERFORMANCE").map((f) => ({ id: f.id, title: f.title, severity: f.severity, device: f.device, affectedPageCount: f.affectedPageCount, measured: measuredSummary(toLike(f), pagesCrawled || null) }));
  const criticalHigh = (severityCounts.CRITICAL ?? 0) + (severityCounts.HIGH ?? 0);

  return (
    <div className="space-y-6">
      {/* 1 ── Audit overview ─────────────────────────────────────────────── */}
      <section id="overview" aria-labelledby="overview-heading" className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="px-6 pt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-metadata">
            <span><span className="font-bold uppercase tracking-wider text-muted-foreground">{cap(ind.business)} </span><span className="font-semibold text-foreground">{business.name}</span>{business.city && <span className="text-muted-foreground"> · {business.city}</span>}</span>
            <span><span className="font-bold uppercase tracking-wider text-muted-foreground">Audited </span><span className="font-semibold text-foreground">{data.checkedAtLabel}</span></span>
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <h1 id="overview-heading" className="text-heading-1 font-extrabold leading-[1.08] tracking-tight text-foreground">
              {data.headline.line1} <span className="text-primary">{data.headline.line2}</span>
            </h1>
            {/* Desktop: beside the heading. Phone: directly under it, full-width touch target. */}
            <div className="flex w-full flex-col items-start gap-1 sm:w-auto sm:shrink-0 sm:items-end sm:pt-1">
              <DownloadPdfButton publicToken={publicToken} className="w-full sm:w-auto" />
              <RequestTechnicalReportLink publicToken={publicToken} className="sm:items-end sm:text-right" />
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-6 border-t border-border px-6 py-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <ScoreGauge score={overall} size={150} strokeWidth={12} status={overallStatus ?? undefined} label="Overall SEO health, our audit" caption="SEO health · out of 100" />
          <div className="min-w-0">
            <p className="text-body leading-relaxed text-foreground">{data.summary ?? data.dek}</p>
            {strongest && weakest && strongest.key !== weakest.key && (
              <p className="mt-2 text-body-small text-muted-foreground">
                <span className="font-semibold text-foreground">Strongest:</span> {strongest.label} <span className="mx-1.5 text-border">·</span> <span className="font-semibold text-foreground">Biggest opportunity:</span> {weakest.label}
              </p>
            )}
            <dl className="mt-4 grid grid-cols-3 gap-3">
              {[
                [String(pagesCrawled), "Pages crawled", data.crawlStats?.budgetHit && data.crawlStats.budgetHit !== "none" ? "crawl budget reached" : "full crawl"],
                [String(criticalHigh), "Critical & high", `${severityCounts.MEDIUM ?? 0} medium · ${severityCounts.LOW ?? 0} low`],
                [String(findings.length), "Verified findings", `from ${data.checksRun} checks`],
              ].map(([v, l, c]) => (
                <div key={l} className="rounded-[var(--radius-medium)] border border-border bg-background px-3 py-2.5">
                  <dd className="font-display text-[1.375rem] font-bold leading-none text-foreground">{v}</dd>
                  <dt className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{l}</dt>
                  <dd className="text-[11px] text-muted-foreground">{c}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* 1b ── Competitor call-out: only when nearby practices measured better ─ */}
      {data.comparison && <CompetitorAlertCard comparison={data.comparison} publicToken={publicToken} />}

      {/* 2 ── Google website checks ──────────────────────────────────────── */}
      <GoogleChecksSection rows={data.performance} pillarScore={scores?.performance ?? null} auditScore={overall} auditChecks={data.checksRun} pagesCrawled={pagesCrawled} findings={perfFindings} stageStatus={data.stageStatus} stageDetail={data.stageDetail} />

      {/* 3 ── Findings by area ───────────────────────────────────────────── */}
      <section id="areas" aria-labelledby="areas-heading" className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="px-6 pt-6 pb-4">
          <h2 id="areas-heading" className="text-heading-3 font-semibold text-foreground">Findings by area</h2>
          <p className="mt-1 text-body-small text-muted-foreground">Our SEO audit, pillar by pillar. Each score starts at 100 and loses points for every verified issue; &ldquo;not measured&rdquo; never counts against you.</p>
        </div>
        <ul className="divide-y divide-border-subtle border-t border-border">
          {PILLARS.map((p) => {
            const score = scores ? scores[p.key] : null;
            const mine = findings.filter((f) => f.pillar === p.pillar);
            const status = score === null ? null : statusFromScore(score);
            return (
              <li key={p.key} className="grid gap-x-4 gap-y-1 px-6 py-3.5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <span className="hidden h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-primary sm:flex"><p.Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-body font-semibold text-foreground">{p.label}</p>
                  <p className="text-body-small text-muted-foreground">
                    {score === null
                      ? p.notMeasured(business.city)
                      : mine.length
                        ? `${mine.length} finding${mine.length === 1 ? "" : "s"} — ${mine.slice(0, 3).map((f) => f.title).join("; ")}${mine.length > 3 ? "; …" : "."}`
                        : "No problems found in the checks we ran."}
                    {p.key === "performance" && score !== null && <> <a href="#google-checks" className="font-semibold text-primary hover:underline">Google&apos;s scores ↓</a></>}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  {score === null ? (
                    <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-[0.75rem] font-semibold leading-none text-muted-foreground">Not measured</span>
                  ) : (
                    <>
                      <span className="font-display text-[1.25rem] font-bold leading-none text-foreground">{score}<span className="text-[0.75rem] font-normal text-muted-foreground">/100</span></span>
                      <StatusBadge status={status!} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 4 ── Action plan ────────────────────────────────────────────────── */}
      <section id="action-plan" aria-labelledby="plan-heading" className="space-y-3">
        <div className="px-1">
          <h2 id="plan-heading" className="text-heading-3 font-semibold text-foreground">Action plan</h2>
          <p className="mt-1 text-body-small text-muted-foreground">The {actionPlan.length} fixes that matter most, ranked by severity, reach and effort. Every item is a verified finding — details and evidence are below.</p>
        </div>
        {actionPlan.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><p className="text-body-small text-muted-foreground">Nothing crossed our thresholds — the site is in good shape on the checks we ran.</p></div>
        ) : (
          <ol className="space-y-3">
            {actionPlan.map((f, i) => {
              const like = toLike(f);
              return (
                <li key={f.id} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-display text-body font-bold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.LOW}`}>{f.severity.toLowerCase()}</span>
                      <span className="text-[11px] text-muted-foreground">{PILLAR_LABEL[f.pillar] ?? f.pillar} · {f.affectedPageCount} page{f.affectedPageCount === 1 ? "" : "s"} · effort {f.effort}/5 · {OWNER_LABEL[f.owner] ?? f.owner} · {BUCKET_LABEL[f.bucket]?.toLowerCase() ?? f.bucket}</span>
                    </div>
                    <h3 className="mt-1 text-body font-bold text-foreground">{f.title}</h3>
                    <p className="mt-1 text-body-small text-foreground"><span className="font-semibold">Measured:</span> {measuredSummary(like, pagesCrawled || null)}</p>
                    <p className="mt-0.5 text-body-small text-muted-foreground">{whyInBrief(like)}</p>
                    <p className="mt-1.5 text-body-small text-foreground"><span className="font-semibold">Do this:</span> {primaryAction(like)} <a href={`#finding-${f.id}`} onClick={() => openFinding(f.id)} className="whitespace-nowrap font-semibold text-primary hover:underline">Full details ↓</a></p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* 4b ── Local comparison + financial opportunity: after the priority findings, before the consultation CTA ── */}
      {data.comparison && <LocalComparisonSection comparison={data.comparison} publicToken={publicToken} />}
      {data.opportunity && <OpportunitySection scenario={data.opportunity} publicToken={publicToken} businessName={business.name} />}

      {/* 5 ── Detailed findings ──────────────────────────────────────────── */}
      {findings.length > 0 && (
        <section id="detailed-findings" aria-labelledby="details-heading" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h2 id="details-heading" className="text-heading-3 font-semibold text-foreground">Detailed findings ({findings.length})</h2>
            <p className="text-metadata text-muted-foreground">{severityCounts.CRITICAL ?? 0} critical · {severityCounts.HIGH ?? 0} high · {severityCounts.MEDIUM ?? 0} medium · {severityCounts.LOW ?? 0} low{severityCounts.OPPORTUNITY ? ` · ${severityCounts.OPPORTUNITY} suggestions` : ""}</p>
          </div>
          {(["this_week", "this_month", "this_quarter"] as const).map((bucket) => {
            const items = findings.filter((f) => f.bucket === bucket);
            if (!items.length) return null;
            return (
              <div key={bucket} className="space-y-3">
                <h3 className="px-1 text-metadata font-bold uppercase tracking-wider text-muted-foreground">{BUCKET_LABEL[bucket]}</h3>
                {items.map((f) => (
                  <FindingCard key={f.id} f={f} pillarLabel={PILLAR_LABEL[f.pillar] ?? f.pillar} totalPages={pagesCrawled || null} />
                ))}
              </div>
            );
          })}
        </section>
      )}

    </div>
  );
}
