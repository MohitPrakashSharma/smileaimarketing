import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env.server";
import { auditQueue } from "@/lib/queue";

/**
 * Single entry point for running an audit. Every trigger (self-serve
 * form, admin re-run, campaign discovery) goes through here, so there is
 * exactly one code path per engine and the two old duplicate pipelines
 * (inline in unlock-lead + the worker) are gone.
 *
 *  - `runAudit`     executes now, in this process, with a status lock.
 *  - `dispatchAudit` either enqueues for the worker (AUDIT_EXECUTION=queue)
 *                   or runs inline without blocking the HTTP response.
 */

export interface EngineResult {
  engine: "LEGACY_V1" | "CRAWL_V2";
  score: number;
  aiEmailSubject?: string;
  aiEmailOpening?: string;
}

export interface RunAuditOptions {
  trigger: "self_serve" | "admin" | "campaign";
  /** Force an engine regardless of CRAWL_V2 (used for A/B comparison from the admin). */
  engine?: "LEGACY_V1" | "CRAWL_V2";
  maxPages?: number;
}

export function selectedEngine(override?: RunAuditOptions["engine"]): "LEGACY_V1" | "CRAWL_V2" {
  return override ?? (env.CRAWL_V2 ? "CRAWL_V2" : "LEGACY_V1");
}

export async function runAudit(auditId: string, opts: RunAuditOptions): Promise<EngineResult | null> {
  // Lock: only a PENDING or FAILED audit can start. A concurrent worker/inline
  // call for the same audit becomes a no-op instead of a duplicate run.
  const locked = await prisma.audit.updateMany({
    where: { id: auditId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "RUNNING", startedAt: new Date(), errorMessage: null },
  });
  if (locked.count === 0) {
    console.log(`[Audit] ${auditId} is already running or completed — skipping.`);
    return null;
  }
  await prisma.business.updateMany({ where: { audits: { some: { id: auditId } } }, data: { status: "AUDITING" } });

  const engine = selectedEngine(opts.engine);
  console.log(`[Audit] Running ${engine} for ${auditId} (${opts.trigger})`);
  try {
    if (engine === "CRAWL_V2") {
      const { runV2Engine } = await import("./engines/v2");
      return await runV2Engine(auditId, { trigger: opts.trigger, maxPages: opts.maxPages });
    }
    const { runLegacyEngine } = await import("./engines/legacy");
    return await runLegacyEngine(auditId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Audit] ${engine} failed for ${auditId}:`, message);
    await prisma.audit.updateMany({ where: { id: auditId, status: "RUNNING" }, data: { status: "FAILED", errorMessage: message } });
    throw err;
  }
}

/**
 * Queue or fire-and-forget. Inline execution uses `next/server`'s `after()`
 * when available so the response returns immediately and the audit keeps
 * running in the web process; the worker is not required in development.
 */
export async function dispatchAudit(auditId: string, opts: RunAuditOptions, after?: (fn: () => Promise<void>) => void): Promise<{ mode: "queue" | "inline" }> {
  if (env.AUDIT_EXECUTION === "queue") {
    await auditQueue.add("run-audit", { auditId, ...opts }, { jobId: `audit_${auditId}_${Date.now()}` });
    return { mode: "queue" };
  }
  const task = () => runAudit(auditId, opts).then(() => undefined).catch(() => undefined);
  if (after) after(task);
  else void task();
  return { mode: "inline" };
}
