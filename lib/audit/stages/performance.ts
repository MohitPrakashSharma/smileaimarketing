import type { CheckContext } from "../checks/types";
import { selectRepresentativePages, type SelectedPage } from "../pages/select";
import { runPageSpeed, type PerfResult, type PsiOptions, type Strategy } from "../providers/pagespeed";

/**
 * Performance stage: pick representative pages, run PageSpeed Insights for
 * mobile and desktop on each, within a time-box. Failures are results with
 * `status: "unavailable"` — the stage never throws and never blocks the audit.
 */

export interface PerformanceStageOptions {
  maxPages: number;
  concurrency?: number;
  /** Whole-stage budget; runs that don't start in time are marked unavailable/timeout. */
  maxDurationMs?: number;
  psi?: PsiOptions;
  onProgress?: (done: number, total: number, detail: string) => void | Promise<void>;
}

export interface PerformanceStageResult {
  selected: SelectedPage[];
  results: PerfResult[];
  durationMs: number;
}

export async function runPerformanceStage(ctx: CheckContext, opts: PerformanceStageOptions): Promise<PerformanceStageResult> {
  const started = Date.now();
  const selected = selectRepresentativePages(ctx, { max: opts.maxPages });
  const jobs: Array<{ page: SelectedPage; strategy: Strategy }> = [];
  // Mobile first for every page, then desktop — if the time-box hits, mobile (the weighted one) is complete.
  for (const page of selected) jobs.push({ page, strategy: "mobile" });
  for (const page of selected) jobs.push({ page, strategy: "desktop" });

  const results: PerfResult[] = [];
  const maxDuration = opts.maxDurationMs ?? 150_000;
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  let next = 0;
  let done = 0;

  const worker = async () => {
    for (;;) {
      const job = jobs[next++];
      if (!job) return;
      const elapsed = Date.now() - started;
      if (elapsed > maxDuration) {
        results.push({ url: job.page.url, finalUrl: null, strategy: job.strategy, status: "unavailable", error: "performance stage time budget exhausted before this run started", errorCode: "timeout", field: { available: false, source: null, overall: null, lcp: null, inp: null, cls: null, fcp: null, ttfb: null }, lab: null, diagnostics: [], lcpElement: null, lighthouseVersion: null, analysisUtc: null, ms: 0 });
      } else {
        const remaining = Math.max(15_000, maxDuration - elapsed);
        results.push(await runPageSpeed(job.page.url, job.strategy, { ...opts.psi, timeoutMs: Math.min(opts.psi?.timeoutMs ?? 60_000, remaining) }));
      }
      done++;
      await opts.onProgress?.(done, jobs.length, `${done}/${jobs.length} PageSpeed runs`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length || 1) }, worker));

  return { selected, results, durationMs: Date.now() - started };
}
