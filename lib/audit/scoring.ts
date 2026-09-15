import type { CheckRun, Pillar } from "./checks/types";

/**
 * Pillar and overall scores — plan §9.2. Every pillar starts at 100 and
 * each failing check subtracts `weight × min(1, pageShare × 2)`. The
 * breakdown is returned alongside the number so the report (and the admin)
 * can show exactly which check cost which points. Deterministic only.
 */

export interface PenaltyLine {
  checkId: string;
  weight: number;
  pageShare: number;
  penalty: number;
  affectedPageCount: number;
}

export interface PillarScore {
  score: number | null; // null = not measured
  start: number;
  penalties: PenaltyLine[];
  checksRun: number;
  checksFailed: number;
  reason?: string;
}

export interface Scores {
  overall: number | null;
  technical: PillarScore;
  content: PillarScore;
  performance: PillarScore;
  search: PillarScore;
  local: PillarScore;
}

/**
 * Overall = weighted mean of the pillars that were actually measured; weights
 * are renormalised over the measured set so a `null` pillar neither helps nor
 * hurts. Phase 2A added PERFORMANCE (0.20) and rebalanced: a Phase-1 audit
 * (no performance) computes exactly as before once renormalised.
 */
const PILLAR_WEIGHTS: Record<"technical" | "content" | "performance" | "search" | "local", number> = { technical: 0.3, content: 0.25, performance: 0.2, search: 0.15, local: 0.1 };

export function penaltyFor(weight: number, pageShare: number): number {
  return Math.round(weight * Math.min(1, pageShare * 2) * 100) / 100;
}

export function scorePillar(runs: CheckRun[], pillar: Pillar): PillarScore {
  const mine = runs.filter((r) => r.def.pillar === pillar);
  // Only PASS/FAIL are measurements; INFO rows (rate-limited, blocked, timeouts) carry no verdict.
  const ran = mine.filter((r) => r.outcome.status === "PASS" || r.outcome.status === "FAIL");
  if (!ran.length) return { score: null, start: 100, penalties: [], checksRun: 0, checksFailed: 0, reason: mine.some((r) => r.outcome.reason?.includes("blocked")) ? "site blocked automated access — not measured" : "no checks could run for this pillar" };
  const penalties: PenaltyLine[] = mine
    .filter((r) => r.outcome.status === "FAIL")
    .map((r) => ({ checkId: r.def.id, weight: r.def.weight, pageShare: Math.round(r.pageShare * 1000) / 1000, penalty: penaltyFor(r.def.weight, r.pageShare), affectedPageCount: r.affectedPageCount }))
    .sort((a, b) => b.penalty - a.penalty);
  const total = penalties.reduce((s, p) => s + p.penalty, 0);
  return { score: Math.max(0, Math.round(100 - total)), start: 100, penalties, checksRun: ran.length, checksFailed: penalties.length };
}

export function computeScores(runs: CheckRun[], opts: { localRelevant: boolean; searchMeasured: boolean; measurable?: boolean }): Scores {
  // A crawl that produced no HTML page (blocked, timed out, DNS failure) measures nothing.
  // Two or three site-level checks are not a basis for a score.
  const notMeasured = (reason: string): PillarScore => ({ score: null, start: 100, penalties: [], checksRun: 0, checksFailed: 0, reason });
  if (opts.measurable === false) {
    const reason = "no page could be crawled — not measured";
    return { overall: null, technical: notMeasured(reason), content: notMeasured(reason), performance: notMeasured(reason), search: notMeasured(reason), local: notMeasured(reason) };
  }
  const technical = scorePillar(runs, "TECHNICAL");
  const content = scorePillar(runs, "CONTENT");
  const performance = scorePillar(runs, "PERFORMANCE");
  if (performance.score === null) performance.reason = runs.some((r) => r.def.pillar === "PERFORMANCE") ? "PageSpeed data unavailable — not measured" : "performance stage did not run";
  const search = opts.searchMeasured ? scorePillar(runs, "SEARCH") : { score: null, start: 100, penalties: [], checksRun: 0, checksFailed: 0, reason: "search data not collected (Phase 2)" };
  const local = opts.localRelevant ? scorePillar(runs, "LOCAL") : { score: null, start: 100, penalties: [], checksRun: 0, checksFailed: 0, reason: "no physical location" };
  if (opts.localRelevant && local.score === null) local.reason = "local data not collected (Phase 2)";

  const parts: Array<[keyof typeof PILLAR_WEIGHTS, PillarScore]> = [["technical", technical], ["content", content], ["performance", performance], ["search", search], ["local", local]];
  const measured = parts.filter(([, p]) => p.score !== null);
  const weightSum = measured.reduce((s, [k]) => s + PILLAR_WEIGHTS[k], 0);
  const overall = measured.length ? Math.round(measured.reduce((s, [k, p]) => s + (p.score! * PILLAR_WEIGHTS[k]) / weightSum, 0)) : null;
  return { overall, technical, content, performance, search, local };
}

export function gradeFor(score: number | null): "excellent" | "good" | "needs_work" | "at_risk" | "not_measured" {
  if (score === null) return "not_measured";
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 55) return "needs_work";
  return "at_risk";
}
