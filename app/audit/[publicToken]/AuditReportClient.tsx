"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import StatusBadge, { statusFromScore, type StatusLevel } from "@/components/ui/StatusBadge";
import { IconMapPin, IconCalendarCheck, IconSearch, IconStar, IconMonitor, IconPhoneWave, IconUsers, IconTrendingUp } from "@/components/icons";
import { industryFromCategory, cap, type IndustryProfile } from "@/lib/industry";

// Same status→accent-color mapping as the landing page's sample preview —
// used as a left-border "severity" indicator on each findings row, the way
// a lab/chart report flags a line item at a glance.
const STATUS_ACCENT: Record<StatusLevel, string> = {
  healthy: "var(--color-status-healthy-fg)",
  opportunity: "var(--color-status-opportunity-fg)",
  attention: "var(--color-status-attention-fg)",
};

type Finding = {
  category: string;
  score: number;
  title: string;
  detail: string;
  recommendation: string | null;
  findings: Record<string, unknown>;
};

// Same category → label/icon mapping as the landing page's sample preview
// (components/SampleAuditPreview.tsx), so the real report matches what was promised.
const categoryMeta = (ind: IndustryProfile): Record<string, { label: string; Icon: typeof IconSearch }> => ({
  LOCAL_VISIBILITY: { label: `${cap(ind.customer)} Discovery`, Icon: IconSearch },
  REPUTATION: { label: `${cap(ind.customer)} Trust`, Icon: IconStar },
  WEBSITE_QUALITY: { label: "Website Experience", Icon: IconMonitor },
  CONVERSION: { label: `${cap(ind.booking)} Journey`, Icon: IconPhoneWave },
  COMPETITOR_GAP: { label: "Competitive Position", Icon: IconUsers },
  // v2 engine pillars
  TECHNICAL: { label: "Technical SEO", Icon: IconMonitor },
  CONTENT: { label: "On-page & Content", Icon: IconSearch },
  SEARCH: { label: "Search Opportunity", Icon: IconUsers },
  LOCAL: { label: "Local SEO", Icon: IconMapPin },
  PERFORMANCE: { label: "Performance", Icon: IconTrendingUp },
});
const CATEGORY_ORDER = ["LOCAL_VISIBILITY", "REPUTATION", "WEBSITE_QUALITY", "CONVERSION", "COMPETITOR_GAP"];
const CATEGORY_ORDER_V2 = ["TECHNICAL", "CONTENT", "PERFORMANCE", "SEARCH", "LOCAL"];

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-danger/10 text-danger",
  MEDIUM: "bg-warning/15 text-[var(--color-status-opportunity-fg)]",
  LOW: "bg-surface-muted text-muted-foreground",
  OPPORTUNITY: "bg-accent-soft text-primary",
};
const BUCKET_LABEL: Record<string, string> = { this_week: "Do this week", this_month: "Do this month", this_quarter: "Plan this quarter" };

type V2Finding = {
  id: string;
  pillar: string;
  section: string;
  severity: string;
  title: string;
  affectedUrls: string[];
  affectedPageCount: number;
  detectedValue: string | null;
  expectedValue: string | null;
  whyItMatters: string;
  recommendedFix: string;
  developerDetails: Array<{ checkId: string; title: string; severity: string; affectedPageCount: number; detected: string | null; expected: string; fix: string; developerFix: string | null; urls: Array<{ url: string; detected?: string; expected?: string }> }> | null;
  impact: number;
  effort: number;
  confidence: number;
  priorityScore: number;
  owner: string;
  bucket: string;
  evidenceKind: string | null;
  source: string | null;
  device: string | null;
};

type V2Payload = {
  scoresLocked: boolean;
  scores: null | { overall: number | null; technical: number | null; content: number | null; performance: number | null; search: number | null; local: number | null };
  severityCounts: Record<string, number>;
  crawlStats: { pagesCrawled?: number; pagesDiscovered?: number; budgetHit?: string; durationMs?: number } | null;
  findings: V2Finding[];
  pages: Array<{ url: string; statusCode: number | null; title: string | null; indexable: boolean | null; wordCount: number | null; depth: number | null }>;
};

type ProgressView = {
  stages: Array<{ key: string; label: string; status: string; detail?: string }>;
  pagesCrawled: number;
  pagesDiscovered: number;
  findingsSoFar: number;
} | null;

type Competitor = {
  name: string;
  rank: number;
  mapScore: number | null;
};

type Narrative = {
  headline: { line1: string; line2: string };
  dek: string;
  stats: Array<{ value: string; label: string; caption: string }>;
  fixCards: Array<{ title: string; detail: string; impact: string }>;
  quietLeaks: Array<{ title: string; detail: string }>;
};

type AuditData = {
  status?: string;
  engine?: "LEGACY_V1" | "CRAWL_V2";
  business: { name: string; website: string; city: string; category?: string; opportunityScore: number };
  checkedAt: string;
  summary: string | null;
  narrative: Narrative;
  v2?: V2Payload;
  // present while the audit is still running
  progress?: ProgressView;
  findingsSoFar?: Array<{ title: string; severity: string; pillar: string; affectedPageCount: number }>;
  errorMessage?: string | null;
  scorecard: {
    localVisibility: number;
    websiteQuality: number;
    conversionExperience: number;
    reviewsReputation: number;
    competitorGap: number;
  };
  findings: Finding[];
  competitors: Competitor[];
};

export default function AuditReportClient({ publicToken }: { publicToken: string }) {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Offline visit request state
  const [address, setAddress] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitError, setVisitError] = useState("");

  // Online booking state
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    async function fetchReport() {
      try {
        const res = await fetch(`/api/audit/${publicToken}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load audit");
        }
        if (cancelled) return;
        setData(json);
        // Progressive audit: keep polling until the engine finishes or fails.
        if (json.status === "PENDING" || json.status === "RUNNING") timer = setTimeout(fetchReport, 2000);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchReport();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [publicToken]);

  const handleInPersonRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (visitLoading) return;
    setVisitLoading(true);
    setVisitError("");

    try {
      const res = await fetch(`/api/audit/${publicToken}/request-visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, preferredWindow, notes }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to submit request");
      }
      setVisitSubmitted(true);
    } catch (err: unknown) {
      setVisitError(err instanceof Error ? err.message : "Error submitting visit request");
    } finally {
      setVisitLoading(false);
    }
  };

  const handleOnlineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingLoading) return;
    if (!meetingTime || Number.isNaN(new Date(meetingTime).getTime())) {
      setBookingError("Please pick a date and time");
      return;
    }
    setBookingLoading(true);
    setBookingError("");

    try {
      const res = await fetch(`/api/audit/${publicToken}/book-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // meetingTime comes from a datetime-local input ("2026-08-08T23:56") —
        // no seconds or timezone, which fails the API's z.string().datetime()
        // validation. Convert to a real ISO string (UTC) before sending.
        body: JSON.stringify({ scheduledTime: new Date(meetingTime).toISOString(), notes: meetingNotes }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to schedule meeting");
      }
      setBookingSubmitted(true);
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Error scheduling meeting");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
          <p className="text-body-small font-semibold text-muted-foreground">Loading your audit report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
          <p className="text-heading-3 font-bold text-danger">Report Not Found</p>
          <p className="mt-3 text-body-small text-muted-foreground">
            {error || "Could not retrieve the specified audit report."}
          </p>
          <Link
            href="/free-dental-audit"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-body-small font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Run a New Audit
          </Link>
        </div>
      </div>
    );
  }

  if (data.status === "PENDING" || data.status === "RUNNING" || data.status === "FAILED") {
    const stages = data.progress?.stages ?? [];
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 shadow-lg">
          {data.status === "FAILED" ? (
            <>
              <p className="text-heading-3 font-bold text-danger">We couldn&apos;t finish this audit</p>
              <p className="mt-3 text-body-small text-muted-foreground">{data.errorMessage || "Something went wrong while analyzing the website."}</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 shrink-0 animate-spin rounded-full border-4 border-primary/25 border-t-primary" />
                <div>
                  <p className="text-heading-3 font-bold text-foreground">Analyzing {data.business.name}</p>
                  <p className="text-metadata text-muted-foreground">Your report fills in as each stage completes. Scores appear once the crawl is done.</p>
                </div>
              </div>
              {stages.length > 0 && (
                <ol className="mt-6 space-y-2">
                  {stages.map((st) => (
                    <li key={st.key} className={`flex items-center gap-2.5 text-body-small ${st.status === "pending" ? "text-muted-foreground/60" : "text-foreground"}`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${st.status === "done" ? "bg-primary text-primary-foreground" : st.status === "running" ? "animate-spin border-2 border-primary/30 border-t-primary" : st.status === "skipped" ? "bg-border" : "border border-border"}`} aria-hidden>
                        {st.status === "done" ? "✓" : ""}
                      </span>
                      <span>
                        {st.key === "crawl" && data.progress && data.progress.pagesCrawled > 0 ? `Pages crawled ${data.progress.pagesCrawled} / ${Math.max(data.progress.pagesCrawled, data.progress.pagesDiscovered)}` : st.label}
                        {st.detail && st.key !== "crawl" && <span className="ml-1.5 text-metadata text-muted-foreground">{st.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {data.findingsSoFar && data.findingsSoFar.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-metadata font-bold uppercase tracking-wider text-primary">Verified so far</p>
                  <ul className="mt-2 space-y-1.5">
                    {data.findingsSoFar.slice(0, 6).map((f) => (
                      <li key={f.title} className="flex items-start gap-2 text-body-small">
                        <span className={`mt-0.5 shrink-0 rounded-full px-1.5 text-[10px] font-bold uppercase ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.LOW}`}>{f.severity.toLowerCase()}</span>
                        <span>{f.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  const { business, checkedAt, summary, narrative, findings, competitors } = data;
  const ind = industryFromCategory(business.category);
  const CATEGORY_META = categoryMeta(ind);
  const isV2 = data.engine === "CRAWL_V2" && Boolean(data.v2);
  const v2 = data.v2;

  const orderedFindings = (isV2 ? CATEGORY_ORDER_V2 : CATEGORY_ORDER)
    .map((cat) => findings.find((f) => f.category === cat))
    .filter((f): f is Finding => Boolean(f));
  const strongest = orderedFindings.length > 0
    ? orderedFindings.reduce((a, b) => (a.score >= b.score ? a : b))
    : null;
  const biggestOpportunity = orderedFindings.length > 0
    ? orderedFindings.reduce((a, b) => (a.score <= b.score ? a : b))
    : null;
  const checkedAtLabel = new Date(checkedAt).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const localFinding = findings.find((f) => f.category === "LOCAL_VISIBILITY");
  const ownRank = localFinding?.findings.ownRank as number | null | undefined;
  const rankVerified = Boolean(localFinding?.findings.verified);
  const localScore = localFinding?.score ?? null;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground lg:pb-16">
      {/* Header — a letterhead-style metadata row first, like a chart a dentist already knows how to read */}
      <header className="border-b border-border bg-surface py-6 sm:py-8">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 border-b border-border pb-4 text-metadata">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                <span className="font-bold uppercase tracking-wider text-muted-foreground">Practice </span>
                <span className="font-semibold text-foreground">{business.name}</span>
              </span>
              <span>
                <span className="font-bold uppercase tracking-wider text-muted-foreground">Location </span>
                <span className="font-semibold text-foreground">{business.city}</span>
              </span>
            </div>
            <span>
              <span className="font-bold uppercase tracking-wider text-muted-foreground">Checked </span>
              <span className="font-semibold text-foreground">{checkedAtLabel}</span>
            </span>
          </div>

          <h1 className="mt-5 text-display font-extrabold leading-[1.05] tracking-tight text-foreground">
            {narrative.headline.line1}
            <br />
            <span className="inline-block rounded-lg bg-primary px-2 text-primary-foreground">{narrative.headline.line2}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-body leading-relaxed text-muted-foreground">{narrative.dek}</p>

          {/* By the numbers */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {narrative.stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-3 sm:p-4">
                <span className="block text-heading-3 font-extrabold text-primary sm:text-heading-2">{s.value}</span>
                <span className="mt-1 block text-metadata font-bold uppercase tracking-wider text-foreground">{s.label}</span>
                <span className="block text-[11px] text-muted-foreground">{s.caption}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto mt-10 grid max-w-[1200px] gap-8 px-6 sm:px-8 lg:grid-cols-[63%_37%]">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Practice Assessment — the real, plain-English synthesis of this audit */}
          {summary && (
            <div
              className="rounded-xl border border-border bg-surface p-6 shadow-sm"
              style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-primary)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-heading-3 font-semibold text-foreground">{isV2 ? "Assessment" : `${cap(ind.business)} Assessment`}</h2>
                <span className="shrink-0 text-right">
                  <span className="block text-heading-2 font-extrabold text-primary">
                    {business.opportunityScore}<span className="text-body-small font-normal text-muted-foreground">/100</span>
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{isV2 ? "SEO health" : "Opportunity"}</span>
                </span>
              </div>
              <p className="mt-3 text-body leading-relaxed text-foreground">{summary}</p>

              {strongest && biggestOpportunity && strongest.category !== biggestOpportunity.category && (
                <p className="mt-4 border-t border-border pt-4 text-body-small text-muted-foreground">
                  <span className="font-bold text-foreground">Strongest: </span>
                  {CATEGORY_META[strongest.category]?.label ?? strongest.category}
                  <span className="mx-2 text-border">·</span>
                  <span className="font-bold text-foreground">Biggest opportunity: </span>
                  {CATEGORY_META[biggestOpportunity.category]?.label ?? biggestOpportunity.category}
                </p>
              )}
            </div>
          )}

          {/* v2: pillar scores — null means "not measured", never a fake number */}
          {isV2 && v2 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {([["Technical", v2.scores?.technical], ["Content", v2.scores?.content], ["Performance", v2.scores?.performance], ["Search", v2.scores?.search], ["Local", v2.scores?.local]] as Array<[string, number | null | undefined]>).map(([label, score]) => (
                <div key={label} className="rounded-xl border border-border bg-surface p-4">
                  <span className="block text-heading-3 font-extrabold text-foreground">{score == null ? "—" : score}<span className="text-metadata font-normal text-muted-foreground">{score == null ? "" : "/100"}</span></span>
                  <span className="block text-metadata font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                  {score == null && <span className="block text-[11px] text-muted-foreground">not measured yet</span>}
                </div>
              ))}
            </div>
          )}

          {/* Findings by Area — the real per-category findings, same 5-area model as the sample preview */}
          {orderedFindings.length > 0 && (
            <div className="space-y-4">
              <h2 className="px-1 text-heading-3 font-semibold text-foreground">Findings by area</h2>
              <div className="space-y-3">
                {orderedFindings.map((f) => {
                  const meta = CATEGORY_META[f.category];
                  const Icon = meta?.Icon ?? IconMapPin;
                  const status = statusFromScore(f.score);
                  return (
                    <div
                      key={f.category}
                      className="rounded-xl border border-border bg-surface p-5 shadow-sm"
                      style={{ borderLeftWidth: 4, borderLeftColor: STATUS_ACCENT[status] }}
                    >
                      <div className="flex items-start gap-3.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary">
                          <Icon className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                            <div>
                              <p className="text-body font-semibold text-foreground">{meta?.label ?? f.category}</p>
                              <p className="text-metadata text-muted-foreground">{f.title}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="text-body font-bold text-foreground">
                                {f.score}<span className="text-metadata font-normal text-muted-foreground">/100</span>
                              </span>
                              <StatusBadge status={status} />
                            </div>
                          </div>
                          <p className="mt-2.5 text-body-small leading-relaxed text-foreground">{f.detail}</p>
                          {f.recommendation && (
                            <p className="mt-2.5 border-t border-border pt-2.5 text-body-small leading-relaxed text-muted-foreground">
                              <span className="font-bold text-foreground">Recommendation — </span>
                              {f.recommendation}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fixes — only real, verified issues, each with a plain-language impact range */}
          <div className="space-y-4">
            <h2 className="px-1 text-heading-3 font-semibold text-foreground">Top priorities</h2>
            {narrative.fixCards.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <p className="text-body-small leading-relaxed text-muted-foreground">
                  Nothing here scored low enough to call a real weak point — every category is holding up well.
                </p>
              </div>
            ) : (
              narrative.fixCards.map((item, idx) => (
                <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <div className="space-y-1.5">
                    <h3 className="text-body font-bold text-foreground">{item.title}</h3>
                    <p className="text-body-small leading-relaxed text-muted-foreground">{item.detail}</p>
                    <p className="text-metadata font-bold text-primary">{item.impact}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* v2: every verified finding, grouped by when to do it, with developer details */}
          {isV2 && v2 && v2.findings.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
                <h2 className="text-heading-3 font-semibold text-foreground">Detailed findings ({v2.findings.length})</h2>
                <p className="text-metadata text-muted-foreground">
                  {v2.crawlStats?.pagesCrawled ?? 0} pages crawled · {v2.severityCounts.CRITICAL} critical · {v2.severityCounts.HIGH} high · {v2.severityCounts.MEDIUM} medium · {v2.severityCounts.LOW} low
                </p>
              </div>
              {(["this_week", "this_month", "this_quarter"] as const).map((bucket) => {
                const items = v2.findings.filter((f) => f.bucket === bucket);
                if (!items.length) return null;
                return (
                  <div key={bucket} className="space-y-3">
                    <h3 className="px-1 text-metadata font-bold uppercase tracking-wider text-muted-foreground">{BUCKET_LABEL[bucket]}</h3>
                    {items.map((f) => (
                      <details key={f.id} className="group rounded-xl border border-border bg-surface p-5 shadow-sm">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 marker:content-none">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.LOW}`}>{f.severity.toLowerCase()}</span>
                              {f.source === "openai" && <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">AI suggestion</span>}
                              {f.source === "pagespeed" && <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PageSpeed{f.device ? ` · ${f.device}` : ""}</span>}
                              <span className="text-metadata text-muted-foreground">{CATEGORY_META[f.pillar]?.label ?? f.pillar} · {f.affectedPageCount} page{f.affectedPageCount === 1 ? "" : "s"} · effort {f.effort}/5 · {f.owner === "owner" ? "you can do this" : f.owner === "developer" ? "needs a developer" : "we can handle this"}</span>
                            </div>
                            <p className="mt-1.5 text-body font-semibold text-foreground">{f.title}</p>
                          </div>
                          <span className="shrink-0 text-metadata text-muted-foreground group-open:hidden">Details</span>
                        </summary>
                        <div className="mt-4 space-y-3 border-t border-border pt-4 text-body-small leading-relaxed">
                          <p className="text-foreground"><span className="font-bold">Why it matters — </span>{f.whyItMatters}</p>
                          <div className="text-muted-foreground">
                            <span className="font-bold text-foreground">Recommended fix</span>
                            {f.recommendedFix.split("\n").map((line, i) => (
                              <p key={i} className={i === 0 ? "mt-0.5" : "mt-0.5 pl-2"}>{line}</p>
                            ))}
                          </div>
                          {f.developerDetails && f.developerDetails.length > 0 && (
                            <details className="rounded-lg border border-border bg-background p-3">
                              <summary className="cursor-pointer text-metadata font-bold uppercase tracking-wider text-muted-foreground">Technical details for your developer ({f.developerDetails.length} check{f.developerDetails.length === 1 ? "" : "s"})</summary>
                              <div className="mt-3 space-y-3">
                                {f.developerDetails.map((d) => (
                                  <div key={d.checkId} className="text-metadata">
                                    <p className="font-semibold text-foreground">{d.title} <span className="font-normal text-muted-foreground">· {d.checkId} · {d.affectedPageCount} page{d.affectedPageCount === 1 ? "" : "s"}</span></p>
                                    {d.detected && <p className="text-muted-foreground">Detected: <span className="text-foreground">{d.detected}</span></p>}
                                    <p className="text-muted-foreground">Expected: <span className="text-foreground">{d.expected}</span></p>
                                    {d.developerFix && <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-surface-muted p-2 font-mono text-[11px] text-foreground">{d.developerFix}</pre>}
                                    {d.urls.length > 0 && (
                                      <ul className="mt-1 space-y-0.5">
                                        {d.urls.slice(0, 8).map((u) => (
                                          <li key={u.url} className="truncate font-mono text-[11px] text-muted-foreground">{u.url}{u.detected ? ` — ${u.detected}` : ""}</li>
                                        ))}
                                        {d.urls.length > 8 && <li className="text-[11px] text-muted-foreground">+{d.urls.length - 8} more</li>}
                                      </ul>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quiet leaks — secondary issues worth knowing about */}
          {narrative.quietLeaks.length > 0 && (
            <div className="rounded-2xl border border-border bg-surface-muted/30 p-6">
              <h2 className="text-heading-3 font-semibold text-foreground">Also noted</h2>
              <div className="mt-4 space-y-3">
                {narrative.quietLeaks.map((q) => (
                  <div key={q.title} className="border-l-2 border-primary/40 pl-4">
                    <p className="text-body-small font-bold text-foreground">{q.title}</p>
                    <p className="mt-0.5 text-body-small text-muted-foreground">{q.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Competitor Gap Panel */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-heading-3 font-semibold text-foreground">Who&apos;s winning the {ind.customers} you&apos;re missing</h2>
            <p className="mt-1 mb-6 text-body-small text-muted-foreground">
              Your local search strength vs. nearby {ind.businesses} in {business.city}.
            </p>

            <div className="space-y-2.5">
              <div className="rounded-xl border border-primary/30 bg-accent-soft/50 p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-metadata font-bold text-primary-foreground">
                      {rankVerified && ownRank != null ? `#${ownRank}` : "You"}
                    </span>
                    <span className="truncate text-body-small font-bold text-foreground">{business.name}</span>
                  </div>
                  <span className="shrink-0 text-body-small font-bold text-primary">
                    {localScore != null ? `${localScore}/100` : "—"}
                  </span>
                </div>
                {localScore != null && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${localScore}%` }} />
                  </div>
                )}
              </div>

              {competitors.map((c, index) => (
                <div key={index} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-metadata font-bold text-muted-foreground">
                        #{c.rank}
                      </span>
                      <span className="truncate text-body-small font-medium text-foreground">{c.name}</span>
                    </div>
                    {c.mapScore != null && (
                      <span className="flex shrink-0 items-center gap-1 text-body-small font-semibold text-muted-foreground">
                        <IconStar className="h-3.5 w-3.5" />
                        {c.mapScore}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {competitors.length === 0 && (
              <p className="mt-4 text-body-small text-muted-foreground">
                We couldn&apos;t pull a verified competitor list for {business.city} this time — everything else in this report is still based on your real data.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Consultation actions */}
        <div id="consultation" className="scroll-mt-6 space-y-8">
          {/* Online consultation */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
              <IconCalendarCheck className="h-5 w-5" />
            </span>
            <h3 className="text-body font-bold text-foreground">Talk it through, 15 minutes on video</h3>
            <p className="mt-2 text-body-small leading-relaxed text-muted-foreground">
              We&apos;ll screen-share this report together and show you exactly what a {ind.customer} sees when they search for a {ind.searchKeyword} near you — no pitch, just the facts.
            </p>

            {bookingSubmitted ? (
              <div className="mt-6 rounded-xl border border-primary/20 bg-accent-soft p-4 text-center text-body-small font-semibold text-primary">
                Meeting request sent! Calendar details are on their way to your email.
              </div>
            ) : (
              <form onSubmit={handleOnlineBooking} className="mt-6 space-y-4" noValidate>
                {bookingError && (
                  <div role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">
                    {bookingError}
                  </div>
                )}
                <FormField id="meeting-time" label="Select Date & Time" required optionalLabel={false}>
                  <Input
                    id="meeting-time"
                    type="datetime-local"
                    required
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </FormField>
                <FormField id="meeting-notes" label="Notes / Special Requests">
                  <Textarea
                    id="meeting-notes"
                    rows={3}
                    placeholder="e.g. Discuss my maps ranking specifically..."
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                  />
                </FormField>
                <Button type="submit" fullWidth loading={bookingLoading} disabled={bookingLoading}>
                  Schedule My Video Review
                </Button>
              </form>
            )}
          </div>

          {/* In-person visit */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
              <IconMapPin className="h-5 w-5" />
            </span>
            <h3 className="text-body font-bold text-foreground">Or we&apos;ll come to you</h3>
            <p className="mt-2 text-body-small leading-relaxed text-muted-foreground">
              A local consultant visits your {ind.business} and walks your whole team through the findings in person.
            </p>

            {visitSubmitted ? (
              <div className="mt-6 rounded-xl border border-primary/20 bg-accent-soft p-4 text-center text-body-small font-semibold text-primary">
                Visit request received! We&apos;ll confirm a timing window shortly.
              </div>
            ) : (
              <form onSubmit={handleInPersonRequest} className="mt-6 space-y-4" noValidate>
                {visitError && (
                  <div role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">
                    {visitError}
                  </div>
                )}
                <FormField id="visit-address" label="Clinic Address" required optionalLabel={false}>
                  <Input
                    id="visit-address"
                    type="text"
                    required
                    autoComplete="street-address"
                    placeholder="e.g. 123 Main St, Suite 4"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </FormField>
                <FormField id="visit-window" label="Preferred Window" required optionalLabel={false}>
                  <Input
                    id="visit-window"
                    type="text"
                    required
                    placeholder="e.g. Tuesday morning, 9-11am"
                    value={preferredWindow}
                    onChange={(e) => setPreferredWindow(e.target.value)}
                  />
                </FormField>
                <FormField id="visit-notes" label="Notes">
                  <Textarea
                    id="visit-notes"
                    rows={2}
                    placeholder="Anything our consultant should know before visiting?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
                <Button type="submit" variant="secondary" fullWidth loading={visitLoading} disabled={visitLoading}>
                  Submit Visit Request
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Mobile sticky CTA — the consultation forms sit at the bottom of a long report;
          give mobile readers a fast path without reordering the report itself. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 p-3 backdrop-blur-sm lg:hidden">
        <a
          href="#consultation"
          className="flex h-12 items-center justify-center rounded-full bg-primary text-body-small font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Talk To Us About This Report
        </a>
      </div>
    </div>
  );
}
