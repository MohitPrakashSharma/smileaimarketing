import type { Severity } from "./checks/types";

/**
 * Severity escalation and priority scoring — plan §9.1 / §9.3. Pure
 * arithmetic on check evidence; nothing here consults AI.
 */

export const SEVERITY_WEIGHT: Record<Severity, number> = { CRITICAL: 10, HIGH: 6, MEDIUM: 3, LOW: 1, OPPORTUNITY: 4 };
export const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "OPPORTUNITY"];

export function maxSeverity(list: Array<Severity | null | undefined>): Severity | null {
  let best: Severity | null = null;
  for (const s of list) {
    if (!s) continue;
    if (!best || SEVERITY_WEIGHT[s] > SEVERITY_WEIGHT[best]) best = s;
  }
  return best;
}

/**
 * MEDIUM → HIGH when at least half the site is affected; HIGH → CRITICAL
 * when the homepage AND another key page are affected; anything with low
 * confidence is capped at MEDIUM.
 */
export function escalateSeverity(base: Severity, ctx: { pageShare: number; affectsHomepage: boolean; affectsKeyPage: boolean; confidence: number; siteWide?: boolean }): Severity {
  let s = base;
  // One step at most, judged from the base severity (no MEDIUM → CRITICAL chaining).
  // Site-wide checks always have pageShare = 1, so share-based escalation only applies to per-page checks.
  if (!ctx.siteWide && base === "MEDIUM" && ctx.pageShare >= 0.5) s = "HIGH";
  else if (!ctx.siteWide && base === "HIGH" && ctx.affectsHomepage && ctx.pageShare >= 0.5) s = "CRITICAL";
  if (ctx.confidence < 60 && (s === "HIGH" || s === "CRITICAL")) s = "MEDIUM";
  return s;
}

export interface PriorityInput {
  severity: Severity;
  impact: number; // 1–5
  effort: number; // 1–5
  confidence: number; // 0–100
  pageShare: number; // 0–1
  affectsHomepage: boolean;
}

export function priorityScore(i: PriorityInput): number {
  const reach = 0.5 + 0.5 * Math.min(1, Math.max(0, i.pageShare));
  const homeBonus = i.affectsHomepage ? 1.25 : 1;
  const raw = (SEVERITY_WEIGHT[i.severity] * i.impact * reach * homeBonus * (i.confidence / 100)) / Math.max(1, i.effort);
  return Math.round(raw * 100) / 100;
}

export type PriorityBucket = "this_week" | "this_month" | "this_quarter";

export function bucketFor(f: { severity: Severity; impact: number; effort: number }): PriorityBucket {
  if (f.effort >= 4) return "this_quarter";
  if (f.effort <= 2 && (f.severity === "CRITICAL" || f.severity === "HIGH" || (f.severity === "OPPORTUNITY" && f.impact >= 4))) return "this_week";
  return "this_month";
}
