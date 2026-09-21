import { runPageSpeed, type PerfResult, type PsiOptions } from "../providers/pagespeed";
import type { PerfRow } from "../view/performanceView";
import type { CompetitorMeasurement } from "./types";

/**
 * One measurement per competitor: the homepage on mobile, through the same
 * PageSpeed provider and the same four scored Lighthouse categories the audit
 * requests (Agentic Browsing is a checklist, not a score, so it is not
 * compared). The audited practice's side comes from its own stored homepage
 * row — no re-test, so both sides are Google's numbers from the audit period.
 */

export const COMPARISON_CATEGORIES = ["performance", "accessibility", "best-practices", "seo"] as const;

export function fromPerfResult(r: PerfResult): CompetitorMeasurement {
  return {
    strategy: "mobile",
    url: r.url,
    status: r.status,
    error: r.error ?? null,
    performanceScore: r.lab?.performanceScore ?? null,
    lcpMs: r.lab?.lcpMs ?? null,
    cls: r.lab?.cls ?? null,
    tbtMs: r.lab?.tbtMs ?? null,
    accessibility: r.categories.accessibility?.score ?? null,
    bestPractices: r.categories.bestPractices?.score ?? null,
    seo: r.categories.seo?.score ?? null,
    lighthouseVersion: r.lighthouseVersion,
    analysisUtc: r.analysisUtc,
  };
}

/** The audited practice's own homepage × mobile row, in the same shape (null when it was never measured successfully). */
export function ownHomepageMeasurement(rows: PerfRow[]): CompetitorMeasurement | null {
  const row = rows.find((r) => r.strategy === "mobile" && r.pageType === "home") ?? rows.find((r) => r.strategy === "mobile" && r.selectionReason === "homepage");
  if (!row) return null;
  return {
    strategy: "mobile",
    url: row.url,
    status: row.status === "ok" ? "ok" : "unavailable",
    error: row.error,
    performanceScore: row.lab?.performanceScore ?? null,
    lcpMs: row.lab?.lcpMs ?? null,
    cls: row.lab?.cls ?? null,
    tbtMs: row.lab?.tbtMs ?? null,
    accessibility: row.categories?.accessibility?.score ?? null,
    bestPractices: row.categories?.bestPractices?.score ?? null,
    seo: row.categories?.seo?.score ?? null,
    lighthouseVersion: row.lighthouseVersion ?? null,
    analysisUtc: row.analysisUtc ?? null,
  };
}

export async function measureHomepage(website: string, psi: PsiOptions): Promise<CompetitorMeasurement> {
  const url = (() => {
    try {
      const u = new URL(website);
      u.pathname = "/";
      u.search = "";
      u.hash = "";
      return u.toString();
    } catch {
      return website;
    }
  })();
  const run = () => runPageSpeed(url, "mobile", { ...psi, categories: [...COMPARISON_CATEGORIES] });
  let r = await run();
  // PSI occasionally fails a run with a generic Lighthouse error; one retry is cheap and usually enough.
  if (r.status === "unavailable" && r.errorCode === "rejected" && /Something went wrong|runtime error|NO_FCP|NO_LCP/i.test(r.error ?? "")) {
    r = await run();
  }
  // Transient rejections (rate limits, network resets, and — on machines with more than one
  // egress IP — an API-key IP restriction that only some connections trip) get two more tries.
  for (let attempt = 0; attempt < 2 && r.status === "unavailable" && TRANSIENT_ERROR.test(r.error ?? ""); attempt++) {
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
    r = await run();
  }
  return fromPerfResult(r);
}

const TRANSIENT_ERROR = /IP address restriction|429|rate limit|quota|timed out|ECONNRESET|fetch failed|503|502/i;
