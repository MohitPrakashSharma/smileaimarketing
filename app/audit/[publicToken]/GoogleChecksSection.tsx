"use client";

import { useMemo, useState } from "react";
import ScoreGauge, { gaugeStatus, GAUGE_LABEL } from "@/components/ui/ScoreGauge";
import type { StatusLevel } from "@/components/ui/StatusBadge";
import { IconMonitor, IconPhoneWave, IconAlertTriangle, IconCheck } from "@/components/icons";
import { buildPerformanceView, metricsFor, metricGroups, googleChecksFor, testDateLabel, pathOf, type Device, type PerfRow, type MetricView, type GoogleCheckView, type GoogleCheckKey } from "@/lib/audit/view/performanceView";
import type { Rating } from "@/lib/audit/providers/pagespeed";

/**
 * "Google website checks" — the five Lighthouse categories PageSpeed Insights
 * returns for one tested page × device: Performance, Accessibility, Best
 * Practices, Google SEO (scores, drawn as gauges) and Agentic Browsing (a
 * checklist — Google scores it as pass/fail audits, so it is shown as
 * "passed X of Y", never as a percentage). One compact row; each tile
 * expands into its details. Everything comes from stored AuditPerformance
 * rows; a category that was not collected says so.
 */

const RATING_STATUS: Record<Rating, StatusLevel> = { good: "healthy", needs_improvement: "opportunity", poor: "attention" };
const RATING_LABEL: Record<Rating, string> = { good: "Good", needs_improvement: "Needs work", poor: "Poor" };
const BADGE: Record<StatusLevel, string> = { healthy: "badge-healthy", opportunity: "badge-opportunity", attention: "badge-attention" };
const DOT: Record<StatusLevel, string> = { healthy: "var(--color-status-healthy-fg)", opportunity: "var(--color-status-opportunity-fg)", attention: "var(--color-status-attention-fg)" };
const SEVERITY_STYLE: Record<string, string> = {
  CRITICAL: "bg-danger text-white",
  HIGH: "bg-danger/10 text-danger",
  MEDIUM: "bg-warning/15 text-[var(--color-status-opportunity-fg)]",
  LOW: "bg-surface-muted text-muted-foreground",
};

export type PerformanceFindingSummary = {
  id: string;
  title: string;
  severity: string;
  device: string | null;
  affectedPageCount: number;
  measured: string;
};

type Props = {
  rows: PerfRow[];
  /** Our Performance pillar (deductions across every tested page/device) — shown next to Google's score so the two are never confused. */
  pillarScore: number | null;
  /** Our full SEO audit score and check count — to contrast with Google's 10-point SEO basics. */
  auditScore: number | null;
  auditChecks: number;
  pagesCrawled: number;
  findings: PerformanceFindingSummary[];
  stageStatus?: string;
  stageDetail?: string;
};

function Chip({ level, label }: { level: StatusLevel | null; label: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold leading-none ${level ? BADGE[level] : "border-border text-muted-foreground"}`}>
      {level && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {label}
    </span>
  );
}

function MetricRow({ m }: { m: MetricView }) {
  const level = m.rating ? RATING_STATUS[m.rating] : null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: level ? DOT[level] : "var(--color-border-strong)" }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-body-small font-semibold text-foreground">{m.fullName}</span>
          <span className="text-[11px] text-muted-foreground">{m.label}</span>
        </div>
        <p className="text-[12px] leading-snug text-muted-foreground">{m.explain}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className={`block font-display text-[1.125rem] font-bold leading-none ${m.value === null ? "text-placeholder" : "text-foreground"}`}>{m.display}</span>
        <span className="mt-1 block text-[10px] text-muted-foreground">
          {m.source === "field" ? `Real users${m.labDisplay ? ` · lab ${m.labDisplay}` : ""}` : m.source === "lab" ? `Lab · target ${m.goodLabel}` : "No data"}
        </span>
        <span className="mt-1 block">{level ? <Chip level={level} label={RATING_LABEL[m.rating!]} /> : null}</span>
      </div>
    </div>
  );
}

function CheckTile({ c, open, onClick }: { c: GoogleCheckView; open: boolean; onClick: () => void }) {
  const level = c.kind === "score" && c.score !== null ? gaugeStatus(c.score) : c.kind === "checklist" && c.available ? (c.passed === c.applicable ? "healthy" : "opportunity") : null;
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={`google-check-${c.key}`}
      onClick={onClick}
      className={`group flex cursor-pointer flex-col items-center rounded-[var(--radius-medium)] border p-3 text-center transition-colors ${open ? "border-primary bg-accent-soft/40" : "border-border bg-background hover:border-border-strong"}`}
    >
      {c.kind === "score" ? (
        <ScoreGauge score={c.available ? c.score : null} size={84} strokeWidth={8} showLabel={false} label={`Google ${c.label}`} />
      ) : (
        <span className="flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full border-[8px]" style={{ borderColor: level ? DOT[level] : "var(--color-surface-alt)" }} role="img" aria-label={c.available ? `Agentic Browsing: ${c.passed} of ${c.applicable} checks passed` : "Agentic Browsing: not available"}>
          {c.available ? (
            <>
              <span className="font-display text-[1.375rem] font-bold leading-none text-foreground">{c.passed}<span className="text-[0.8rem] text-muted-foreground">/{c.applicable}</span></span>
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">passed</span>
            </>
          ) : (
            <span className="font-display text-[1.375rem] font-bold text-placeholder">—</span>
          )}
        </span>
      )}
      <span className="mt-2 text-body-small font-bold leading-tight text-foreground">{c.label}</span>
      <span className="mt-1">{level ? <Chip level={level} label={c.kind === "score" ? GAUGE_LABEL[level] : c.passed === c.applicable ? "All passed" : "Some failed"} /> : <Chip level={null} label={c.available ? "—" : "Not collected"} />}</span>
      {c.key === "seo" && <span className="mt-1 text-[10px] leading-tight text-muted-foreground">Google basics only</span>}
      <span className="mt-1.5 text-[10px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 group-aria-expanded:opacity-100">{open ? "Hide details" : "Details"}</span>
    </button>
  );
}

export default function GoogleChecksSection({ rows, pillarScore, auditScore, auditChecks, pagesCrawled, findings, stageStatus, stageDetail }: Props) {
  const view = useMemo(() => buildPerformanceView(rows), [rows]);
  const [pageIdx, setPageIdx] = useState(0);
  const [devicePref, setDevicePref] = useState<Device>("mobile");
  const [open, setOpen] = useState<GoogleCheckKey | null>(null);
  const page = view.pages[Math.min(pageIdx, Math.max(0, view.pages.length - 1))] ?? null;
  const device: Device = page ? (devicePref === "desktop" && page.desktop ? "desktop" : page.mobile ? "mobile" : "desktop") : "mobile";
  const row = page ? page[device] : null;
  const checks = useMemo(() => googleChecksFor(row), [row]);
  const deviceLabel = device === "mobile" ? "Mobile" : "Desktop";
  const dateLabel = testDateLabel(row?.analysisUtc);
  const toggle = (k: GoogleCheckKey) => setOpen((cur) => (cur === k ? null : k));

  // ---- honest unavailable state -------------------------------------------------
  if (!view.okRuns) {
    const ran = rows.length > 0;
    return (
      <section id="google-checks" aria-labelledby="google-checks-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground"><IconAlertTriangle className="h-4.5 w-4.5" /></span>
          <div className="min-w-0">
            <h2 id="google-checks-heading" className="text-heading-3 font-semibold text-foreground">Google website checks</h2>
            <p className="mt-1 text-body-small text-muted-foreground">
              {ran
                ? "Google PageSpeed Insights could not test this site during the audit, so these five checks are not available and do not affect your score."
                : stageStatus === "skipped"
                  ? `Google's checks were not run for this audit${stageDetail ? ` (${stageDetail})` : ""}.`
                  : "Google's checks were not run for this audit."}
            </p>
            {ran && (
              <ul className="mt-3 space-y-1 text-metadata text-muted-foreground">
                {view.failedRuns.slice(0, 4).map((r) => (
                  <li key={`${r.url}-${r.strategy}`} className="truncate font-mono text-[11px]">{r.strategy} · {r.url}{r.error ? ` — ${r.error}` : ""}</li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-metadata text-muted-foreground">Re-running the audit later usually resolves this; it is not a problem with your website.</p>
          </div>
        </div>
      </section>
    );
  }

  const metrics = row ? metricsFor(row) : [];
  const groups = metricGroups(metrics);
  const lighthouse = row?.lab?.performanceScore ?? null;
  const otherDevice = page ? (device === "mobile" ? page.desktop : page.mobile) : null;
  const openCheck = open ? checks.find((c) => c.key === open) ?? null : null;

  return (
    <section id="google-checks" aria-labelledby="google-checks-heading" className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="px-6 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="google-checks-heading" className="text-heading-3 font-semibold text-foreground">Google website checks</h2>
            <p className="mt-1 text-body-small text-muted-foreground">
              Google&apos;s own five checks (PageSpeed Insights{row?.lighthouseVersion ? `, Lighthouse ${row.lighthouseVersion}` : ""}) for one page at a time. They complement your SEO audit above; only Performance feeds into it.
            </p>
          </div>
        </div>

        {/* Page + device — what the five results below refer to */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Tested page">
            {view.pages.map((p, i) => {
              const active = i === pageIdx;
              return (
                <button key={p.url} type="button" role="tab" aria-selected={active} onClick={() => setPageIdx(i)} title={p.url} className={`cursor-pointer rounded-full border px-3 py-1.5 text-metadata font-semibold transition-colors ${active ? "border-primary bg-accent-soft text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}>
                  {p.path}
                </button>
              );
            })}
          </div>
          {view.canToggle && page?.mobile && page?.desktop ? (
            <div role="group" aria-label="Device" className="inline-flex rounded-full border border-border bg-background p-0.5">
              {(["mobile", "desktop"] as Device[]).map((d) => {
                const active = device === d;
                const Icon = d === "mobile" ? IconPhoneWave : IconMonitor;
                return (
                  <button key={d} type="button" aria-pressed={active} onClick={() => setDevicePref(d)} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-metadata font-semibold transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {d === "mobile" ? "Mobile" : "Desktop"}
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-metadata font-semibold text-muted-foreground">
              {device === "mobile" ? <IconPhoneWave className="h-3.5 w-3.5" /> : <IconMonitor className="h-3.5 w-3.5" />}
              {deviceLabel} only measured
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{page?.path}</span> on <span className="font-semibold text-foreground">{deviceLabel.toLowerCase()}</span>{dateLabel ? `, tested ${dateLabel}` : ""}. Each result is one Google run — switch page or device above; nothing is averaged.
        </p>

        {/* The five checks */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {checks.map((c) => (
            <CheckTile key={c.key} c={c} open={open === c.key} onClick={() => toggle(c.key)} />
          ))}
        </div>
      </div>

      {/* Expandable detail for the open check */}
      <div className={openCheck ? "border-t border-border bg-background/60 px-6 py-5" : "pb-6"} id={openCheck ? `google-check-${openCheck.key}` : undefined} role="region" aria-live="polite">
        {openCheck && !openCheck.available && (
          <p className="text-body-small text-muted-foreground"><span className="font-semibold text-foreground">{openCheck.label}:</span> {openCheck.unavailableReason}</p>
        )}

        {openCheck?.key === "performance" && openCheck.available && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
              <ScoreGauge score={lighthouse} size={132} strokeWidth={11} label={`Google PageSpeed score, ${deviceLabel.toLowerCase()}, ${page?.path ?? "page"}`} caption={`Google · ${deviceLabel}`} />
              <div className="min-w-0 text-body-small leading-relaxed text-muted-foreground">
                <p className="text-body font-semibold text-foreground">
                  Google scores this page <span className="font-extrabold">{lighthouse}/100</span> on {deviceLabel.toLowerCase()}{lighthouse !== null ? ` — ${GAUGE_LABEL[gaugeStatus(lighthouse)].toLowerCase()}` : ""}.
                </p>
                <p className="mt-1.5">
                  {device === "mobile" ? "Simulated on a mid-range phone over a slow connection — the conditions most visitors are on." : "Simulated on a laptop with a fast connection."} 90+ is good, under 50 is poor.
                  {otherDevice?.lab?.performanceScore != null && <> The same page scores <span className="font-semibold text-foreground">{otherDevice.lab.performanceScore}/100</span> on {device === "mobile" ? "desktop" : "mobile"}.</>}
                </p>
                {pillarScore !== null && (
                  <p className="mt-2 rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2 text-[12px]">
                    <span className="font-bold text-foreground">Why your audit&apos;s Performance score ({pillarScore}/100) differs:</span> that number is ours — it deducts points for every verified performance issue across all {view.pages.length} tested {view.pages.length === 1 ? "page" : "pages"}{" "}on both devices. This gauge is Google{"'"}s single-page score.
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-body font-bold text-foreground">What Google measured</h3>
                <p className="text-[11px] text-muted-foreground">
                  {row?.field?.available ? <><span className="font-semibold text-foreground">Real users</span> = Chrome UX Report, 75th percentile · <span className="font-semibold text-foreground">Lab</span> = Lighthouse simulation</> : <><span className="font-semibold text-foreground">Lab measurements only</span> — Google has no real-visitor (Chrome UX Report) data for this site yet</>}
                </p>
              </div>
              <div className="mt-2 grid gap-3 lg:grid-cols-2">
                {groups.map((g) => (
                  <div key={g.title} className="rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-2">
                    <p className="pt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{g.title} <span className="font-normal normal-case tracking-normal">· {g.hint}</span></p>
                    <div className="divide-y divide-border-subtle">
                      {g.metrics.map((m) => (
                        <MetricRow key={m.key} m={m} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {row?.lcpElement?.snippet && row.lcpElement.snippet.length >= 24 && (
              <details className="rounded-[var(--radius-medium)] border border-border bg-surface px-4 py-3">
                <summary className="cursor-pointer text-metadata font-bold uppercase tracking-wider text-muted-foreground">Largest element on load ({deviceLabel.toLowerCase()}) — for your developer</summary>
                <p className="mt-1 text-[12px] text-muted-foreground">Google waited for this element before counting the page as loaded. Making it appear sooner is the most direct way to improve the loading time above.</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded bg-surface-muted p-2.5 font-mono text-[11px] leading-relaxed text-foreground">{row.lcpElement.snippet}</pre>
              </details>
            )}

            {findings.length > 0 && (
              <div>
                <h3 className="text-body font-bold text-foreground">What&apos;s slowing it down</h3>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Across all tested pages, in priority order. Each is explained with its evidence and fix in the detailed findings.</p>
                <ol className="mt-2 divide-y divide-border-subtle rounded-[var(--radius-medium)] border border-border bg-surface">
                  {findings.map((f) => (
                    <li key={f.id}>
                      <a
                        href={`#finding-${f.id}`}
                        onClick={() => {
                          const el = document.getElementById(`finding-${f.id}`);
                          if (el instanceof HTMLDetailsElement) el.open = true;
                        }}
                        className="group flex items-start justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-surface-muted/60"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLE[f.severity] ?? SEVERITY_STYLE.LOW}`}>{f.severity.toLowerCase()}</span>
                            <span className="text-body-small font-semibold text-foreground">{f.title}</span>
                          </div>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">{f.measured}</p>
                        </div>
                        <span className="shrink-0 pt-0.5 text-metadata font-semibold text-primary group-hover:underline">See fix ↓</span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {openCheck && openCheck.kind === "score" && openCheck.key !== "performance" && openCheck.available && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-body font-semibold text-foreground">
                {openCheck.label}: <span className="font-extrabold">{openCheck.score}/100</span>
                {openCheck.applicable !== null && <span className="ml-2 text-body-small font-normal text-muted-foreground">{openCheck.passed} of {openCheck.applicable} weighted checks passed</span>}
              </p>
              <Chip level={gaugeStatus(openCheck.score!)} label={GAUGE_LABEL[gaugeStatus(openCheck.score!)]} />
            </div>
            <p className="text-body-small text-muted-foreground">{openCheck.scope}. {deviceLabel}, {page?.path}{dateLabel ? `, ${dateLabel}` : ""}.</p>
            {openCheck.key === "seo" && (
              <p className="rounded-[var(--radius-small)] border border-border bg-surface px-3 py-2 text-[12px] text-muted-foreground">
                <span className="font-bold text-foreground">Not the same as your SEO audit.</span> Google&apos;s Lighthouse SEO check is a short technical checklist for one page (crawlable, has a title and description, mobile viewport, valid links). Your SEO audit above{auditScore !== null ? ` (${auditScore}/100)` : ""} ran {auditChecks} checks across {pagesCrawled} crawled {pagesCrawled === 1 ? "page" : "pages"} — content, structure, local signals and technical health together. A high Google score here does not mean the site ranks well.
              </p>
            )}
            {openCheck.failed.length === 0 ? (
              <p className="flex items-center gap-2 text-body-small text-foreground"><IconCheck className="h-4 w-4 text-[var(--color-status-healthy-fg)]" /> Every weighted check passed on this page.</p>
            ) : (
              <div>
                <p className="text-metadata font-bold uppercase tracking-wider text-muted-foreground">Checks that cost points</p>
                <ul className="mt-1.5 divide-y divide-border-subtle rounded-[var(--radius-medium)] border border-border bg-surface">
                  {openCheck.failed.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-body-small font-semibold text-foreground">{a.title}</p>
                        <p className="text-[11px] text-muted-foreground">Lighthouse audit <span className="font-mono">{a.id}</span></p>
                      </div>
                      <span className="shrink-0 text-[12px] text-muted-foreground">{a.displayValue ?? (a.score === 0 ? "Failed" : `${Math.round((a.score ?? 0) * 100)}%`)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {openCheck?.key === "agentic" && openCheck.available && (
          <div className="space-y-3">
            <p className="text-body font-semibold text-foreground">
              Agentic Browsing: <span className="font-extrabold">{openCheck.passed} of {openCheck.applicable}</span> applicable checks passed
            </p>
            <p className="text-body-small text-muted-foreground">
              Google&apos;s newest category tests whether AI agents (assistants that browse on a person&apos;s behalf) can read and operate this page. Google reports it as pass/fail checks rather than a score, and labels it as still under development — treat it as a preview, not a ranking factor.
            </p>
            <ul className="divide-y divide-border-subtle rounded-[var(--radius-medium)] border border-border bg-surface">
              {openCheck.checks.map((c) => {
                const applicable = c.score !== null && c.mode !== "notApplicable" && c.mode !== "manual" && c.mode !== "informative";
                const passed = applicable && (c.mode === "numeric" ? (c.score ?? 0) >= 0.9 : (c.score ?? 0) >= 1);
                return (
                  <li key={c.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-body-small font-semibold text-foreground">{c.title}</p>
                      <p className="text-[11px] text-muted-foreground">{c.group === "webmcp" ? "WebMCP integration" : c.group === "agent-accessibility" ? "Agent accessibility" : "Page stability"} · <span className="font-mono">{c.id}</span>{c.displayValue ? ` · ${c.displayValue}` : ""}</p>
                    </div>
                    <span className="shrink-0">{applicable ? <Chip level={passed ? "healthy" : "attention"} label={passed ? "Passed" : "Failed"} /> : <Chip level={null} label="Not applicable" />}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {view.failedRuns.length > 0 && (
        <p className="border-t border-border px-6 py-3 text-[11px] text-muted-foreground">
          {view.failedRuns.length} of {view.totalRuns} Google runs could not complete ({[...new Set(view.failedRuns.map((r) => `${r.strategy} ${pathOf(r.url)}`))].join(", ")}) — those are simply not shown.
        </p>
      )}
    </section>
  );
}
