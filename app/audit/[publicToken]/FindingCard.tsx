"use client";

import { IconPhoneWave, IconMonitor } from "@/components/icons";
import { measuredSummary, primaryAction, whyInBrief, type FindingLike } from "@/lib/audit/view/findingView";

/**
 * One finding in the prioritised "Detailed findings" list, at two levels.
 *
 *  Default (collapsed): severity, where it came from, the title, the measured
 *  result in plain words, one sentence on why it matters, the action.
 *  Expanded: impact/effort/confidence/priority, the full "why", what we
 *  measured per check (real users / lab / Lighthouse audit / crawler, with
 *  tested URLs and device), the full fix, and developer instructions.
 */

export type FindingDeveloperDetail = {
  checkId: string;
  title: string;
  severity: string;
  dataSource?: string;
  device?: string | null;
  affectedPageCount: number;
  detected: string | null;
  expected: string;
  fix: string;
  developerFix: string | null;
  urls: Array<{ url: string; detected?: string; expected?: string }>;
};

export type FindingView = {
  id: string;
  pillar: string;
  severity: string;
  title: string;
  source: string | null;
  device: string | null;
  affectedUrls: string[];
  affectedPageCount: number;
  detectedValue: string | null;
  whyItMatters: string;
  recommendedFix: string;
  developerDetails: FindingDeveloperDetail[] | null;
  impact: number;
  effort: number;
  confidence: number;
  owner: string;
  bucket: string;
};

const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-danger/10 text-danger",
  MEDIUM: "bg-warning/15 text-[var(--color-status-opportunity-fg)]",
  LOW: "bg-surface-muted text-muted-foreground",
  OPPORTUNITY: "bg-accent-soft text-primary",
};
const SOURCE_LABEL: Record<string, { label: string; hint: string }> = {
  field: { label: "Real users", hint: "Chrome UX Report — what real visitors experienced" },
  lab: { label: "Lab test", hint: "Lighthouse simulation" },
  diagnostic: { label: "Lighthouse audit", hint: "Diagnostic from the Lighthouse run" },
  crawler: { label: "Our crawler", hint: "Measured by our crawler on the live page" },
  ai: { label: "AI review", hint: "Interpretation of crawled content — a suggestion, not a measurement" },
};
const IMPACT_LABEL = ["", "Minor", "Low", "Moderate", "High", "Very high"];
const BUCKET_LABEL: Record<string, string> = { this_week: "Do this week", this_month: "Do this month", this_quarter: "Plan this quarter" };
const OWNER_LABEL: Record<string, string> = { owner: "you can do this", developer: "needs a developer", agency: "we can handle this" };

const shortPath = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? `${u.host}/` : `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
};

export default function FindingCard({ f, pillarLabel, totalPages }: { f: FindingView; pillarLabel: string; totalPages: number | null }) {
  const like: FindingLike = { title: f.title, affectedPageCount: f.affectedPageCount, detectedValue: f.detectedValue, developerDetails: f.developerDetails, recommendedFix: f.recommendedFix, whyItMatters: f.whyItMatters, device: f.device };
  const measured = measuredSummary(like, totalPages);
  const action = primaryAction(like);
  const fixLines = f.recommendedFix.split("\n").filter(Boolean);
  const DeviceIcon = f.device === "desktop" ? IconMonitor : IconPhoneWave;
  const isPageSpeed = f.source === "pagespeed";
  return (
    <details id={`finding-${f.id}`} className="group scroll-mt-24 rounded-xl border border-border bg-surface shadow-sm open:border-primary/40">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 marker:content-none">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.LOW}`}>{f.severity.toLowerCase()}</span>
            {isPageSpeed && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <DeviceIcon className="h-3 w-3" />
                PageSpeed{f.device ? ` · ${f.device}` : ""}
              </span>
            )}
            {f.source === "openai" && <span className="rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">AI suggestion</span>}
            <span className="text-metadata text-muted-foreground">{pillarLabel} · {f.affectedPageCount} page{f.affectedPageCount === 1 ? "" : "s"} · {OWNER_LABEL[f.owner] ?? f.owner}</span>
          </div>
          <p className="mt-1.5 text-body font-semibold text-foreground">{f.title}</p>
          {/* Default view: measured → why → action, in plain words */}
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-body-small sm:grid-cols-[auto_1fr]">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:pt-0.5">Measured</dt>
            <dd className="text-foreground">{measured}</dd>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:pt-0.5">Why</dt>
            <dd className="text-muted-foreground">{whyInBrief(like)}</dd>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:pt-0.5">Action</dt>
            <dd className="text-foreground">{action}</dd>
          </dl>
        </div>
        <span className="shrink-0 text-metadata font-semibold text-primary group-open:hidden">Details</span>
        <span className="hidden shrink-0 text-metadata text-muted-foreground group-open:inline">Close</span>
      </summary>

      <div className="border-t border-border px-5 pb-5 pt-4 text-body-small leading-relaxed">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Expected impact", `${IMPACT_LABEL[f.impact] ?? f.impact} (${f.impact}/5)`],
            ["Effort", `${f.effort}/5`],
            ["Confidence", `${f.confidence}%`],
            ["Priority", BUCKET_LABEL[f.bucket] ?? f.bucket],
          ].map(([k, v]) => (
            <div key={k} className="rounded-[var(--radius-small)] bg-background px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</span>
              <span className="block text-body-small font-semibold text-foreground">{v}</span>
            </div>
          ))}
        </div>

        <p className="mt-4 text-foreground"><span className="font-bold">Why it matters — </span>{f.whyItMatters}</p>

        {f.developerDetails && f.developerDetails.length > 0 && (
          <div className="mt-4">
            <p className="font-bold text-foreground">What we measured</p>
            <ul className="mt-2 space-y-2">
              {f.developerDetails.map((d) => {
                const src = SOURCE_LABEL[d.dataSource ?? (isPageSpeed ? "diagnostic" : "crawler")] ?? SOURCE_LABEL.crawler;
                return (
                  <li key={d.checkId} className="rounded-[var(--radius-medium)] border border-border bg-background p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground" title={src.hint}>{src.label}</span>
                      {d.device && <span className="text-[11px] text-muted-foreground">{d.device}</span>}
                      <span className="text-body-small font-semibold text-foreground">{d.title}</span>
                      <span className="text-[11px] text-muted-foreground">· {d.affectedPageCount} page{d.affectedPageCount === 1 ? "" : "s"}</span>
                    </div>
                    <dl className="mt-2 grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
                      {d.detected && (
                        <>
                          <dt className="text-muted-foreground">Measured</dt>
                          <dd className="font-semibold text-foreground">{d.detected}</dd>
                        </>
                      )}
                      <dt className="text-muted-foreground">Target</dt>
                      <dd className="text-foreground">{d.expected}</dd>
                    </dl>
                    {d.urls.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {d.urls.slice(0, 6).map((u) => (
                          <li key={u.url} className="flex flex-wrap items-baseline gap-x-2 text-[12px]">
                            <a href={u.url} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-[11px] text-primary hover:underline">{shortPath(u.url)}</a>
                            {u.detected && <span className="text-muted-foreground">{u.detected}</span>}
                          </li>
                        ))}
                        {d.urls.length > 6 && <li className="text-[11px] text-muted-foreground">+{d.urls.length - 6} more pages</li>}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-4 text-muted-foreground">
          <p className="font-bold text-foreground">Recommended fix</p>
          {fixLines.map((line, i) => (
            <p key={i} className={i === 0 ? "mt-0.5 text-foreground" : "mt-0.5 pl-2"}>{line}</p>
          ))}
        </div>

        {f.developerDetails?.some((d) => d.developerFix) && (
          <details className="mt-3 rounded-lg border border-border bg-background p-3">
            <summary className="cursor-pointer text-metadata font-bold uppercase tracking-wider text-muted-foreground">For your developer</summary>
            <div className="mt-2 space-y-2">
              {f.developerDetails!.filter((d) => d.developerFix).map((d) => (
                <div key={d.checkId}>
                  <p className="text-[11px] font-semibold text-foreground">{d.title} <span className="font-normal text-muted-foreground">· {d.checkId}</span></p>
                  <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded bg-surface-muted p-2 font-mono text-[11px] text-foreground">{d.developerFix}</pre>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}
