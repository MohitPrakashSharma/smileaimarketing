import type { ProgressStageKey } from "./core/types";

/**
 * Progress payload stored on Audit.progressJson while an audit runs, and
 * returned by GET /api/audit/progress/[auditId]. Scores are deliberately
 * absent — `scoresLocked` flips to true only when the engine has written
 * final pillar scores (plan §0.2).
 */

export interface ProgressStage {
  key: ProgressStageKey;
  label: string;
  status: "pending" | "running" | "done" | "skipped" | "failed";
  detail?: string;
}

export interface AuditProgress {
  engine: "LEGACY_V1" | "CRAWL_V2";
  stage: ProgressStageKey;
  stages: ProgressStage[];
  pagesDiscovered: number;
  pagesCrawled: number;
  findingsSoFar: number;
  /** True once the crawl finished (or hit its budget) — the wizard may advance to the preview. */
  previewReady: boolean;
  /** True only when final scores exist. */
  scoresLocked: boolean;
  updatedAt: string;
  error?: string;
}

export const STAGE_LABELS: Record<ProgressStageKey, string> = {
  detect: "Website detected",
  sitemap: "Sitemap & robots discovered",
  crawl: "Pages crawled",
  technical: "Technical analysis",
  content: "Content analysis",
  search: "Search analysis",
  finalize: "Finalizing report",
  done: "Report ready",
};

export const STAGE_ORDER: ProgressStageKey[] = ["detect", "sitemap", "crawl", "technical", "content", "search", "finalize", "done"];

export function initialProgress(engine: AuditProgress["engine"]): AuditProgress {
  return {
    engine,
    stage: "detect",
    stages: STAGE_ORDER.map((key) => ({ key, label: STAGE_LABELS[key], status: key === "detect" ? "running" : "pending" })),
    pagesDiscovered: 0,
    pagesCrawled: 0,
    findingsSoFar: 0,
    previewReady: false,
    scoresLocked: false,
    updatedAt: new Date().toISOString(),
  };
}

export function advance(p: AuditProgress, to: ProgressStageKey, patch: Partial<AuditProgress> = {}, detailForPrev?: string): AuditProgress {
  const stages: ProgressStage[] = p.stages.map((s): ProgressStage => {
    const idx = STAGE_ORDER.indexOf(s.key);
    const target = STAGE_ORDER.indexOf(to);
    if (idx < target) return { ...s, status: s.status === "skipped" ? "skipped" : "done", detail: s.key === p.stage && detailForPrev ? detailForPrev : s.detail };
    if (idx === target) return { ...s, status: to === "done" ? "done" : "running" };
    return s;
  });
  return { ...p, ...patch, stage: to, stages, updatedAt: new Date().toISOString() };
}

export function setStageDetail(p: AuditProgress, key: ProgressStageKey, detail: string, status?: ProgressStage["status"]): AuditProgress {
  return { ...p, stages: p.stages.map((s) => (s.key === key ? { ...s, detail, ...(status ? { status } : {}) } : s)), updatedAt: new Date().toISOString() };
}

export function failProgress(p: AuditProgress, error: string): AuditProgress {
  return { ...p, error, stages: p.stages.map((s) => (s.key === p.stage ? { ...s, status: "failed" } : s)), updatedAt: new Date().toISOString() };
}
