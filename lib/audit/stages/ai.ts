import type { CheckContext, CheckRun } from "../checks/types";
import type { Finding } from "../findings/groups";
import { selectRepresentativePages, issuesByUrl, type SelectedPage } from "../pages/select";
import { buildBoilerplateSet, buildPageEvidence, estimateTokens, type PageEvidence } from "../ai/evidence";
import { buildMessages, RETRY_NUDGE } from "../ai/prompt";
import { parseAnalysis, scrubUnsupportedClaims, PROMPT_VERSION, type PageAnalysis } from "../ai/schema";
import { completeJson, AiError, type OpenAiClientOptions, type AiErrorCode } from "../ai/openaiClient";
import { analysisToFinding, AI_MIN_CONFIDENCE } from "../ai/findings";

/**
 * Content-intelligence stage. Deterministic selection → compact evidence →
 * one structured OpenAI call per page (bounded concurrency, one retry for
 * transient/invalid-output failures) → validation → claim scrubbing →
 * at most one OPPORTUNITY finding per page. Never throws: every outcome is
 * a row with a status, and the audit completes regardless.
 */

export interface AiPageOutcome {
  url: string;
  pageType: SelectedPage["pageType"];
  selectionReason: string;
  status: "ok" | "unavailable" | "skipped";
  errorCode?: AiErrorCode | "low_confidence" | "empty_content" | "disabled";
  error?: string;
  model?: string;
  promptVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
  evidence: PageEvidence | null;
  result: PageAnalysis | null;
  scrubbed: Array<{ path: string; text: string; pattern: string }>;
  finding: Finding | null;
}

export interface AiStageOptions {
  client: OpenAiClientOptions;
  maxPages: number;
  concurrency?: number;
  enabled?: boolean;
  onProgress?: (done: number, total: number, detail: string) => void | Promise<void>;
}

export interface AiStageResult {
  outcomes: AiPageOutcome[];
  findings: Finding[];
  /** Set when a stage-level failure (auth, model) stopped further calls. */
  haltedBy?: { code: AiErrorCode; message: string };
  durationMs: number;
}

const MIN_CONTENT_WORDS = 40;

export async function runAiStage(ctx: CheckContext, runs: CheckRun[], opts: AiStageOptions): Promise<AiStageResult> {
  const started = Date.now();
  const issues = issuesByUrl(runs);
  const selected = selectRepresentativePages(ctx, { max: opts.maxPages, issuesByUrl: issues, includeIssuePages: true });
  const boilerplate = buildBoilerplateSet(ctx.htmlPages);
  const denominator = Math.max(1, selected.length);
  const outcomes: AiPageOutcome[] = [];
  let halted: AiStageResult["haltedBy"];
  let done = 0;

  const base = (s: SelectedPage): AiPageOutcome => ({ url: s.url, pageType: s.pageType, selectionReason: s.reason, status: "unavailable", promptVersion: PROMPT_VERSION, inputTokens: null, outputTokens: null, evidence: null, result: null, scrubbed: [], finding: null });

  if (opts.enabled === false) {
    return { outcomes: selected.map((s) => ({ ...base(s), status: "skipped", errorCode: "disabled", error: "AI analysis disabled" })), findings: [], durationMs: Date.now() - started };
  }
  if (!opts.client.apiKey) {
    return { outcomes: selected.map((s) => ({ ...base(s), status: "unavailable", errorCode: "no_api_key", error: "OPENAI_API_KEY is not configured" })), findings: [], haltedBy: { code: "no_api_key", message: "OPENAI_API_KEY is not configured" }, durationMs: Date.now() - started };
  }

  const analyseOne = async (s: SelectedPage): Promise<AiPageOutcome> => {
    const out = base(s);
    if (halted) return { ...out, errorCode: halted.code, error: halted.message };
    const evidence = buildPageEvidence(s.page, s.pageType, s.reason, ctx, runs, boilerplate);
    out.evidence = evidence;
    if (evidence.page.contentWordsSent < MIN_CONTENT_WORDS) {
      return { ...out, status: "skipped", errorCode: "empty_content", error: `only ${evidence.page.contentWordsSent} words of content after cleaning — not enough to analyse` };
    }
    const messages = buildMessages(evidence);
    let lastError: AiError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (halted) break;
      try {
        const msgs = attempt === 0 ? messages : [messages[0], { role: "user" as const, content: messages[1].content + RETRY_NUDGE }];
        const completion = await completeJson(opts.client, msgs);
        out.model = completion.model;
        out.inputTokens = completion.inputTokens ?? estimateTokens(msgs.map((m) => m.content).join("\n"));
        out.outputTokens = completion.outputTokens ?? estimateTokens(completion.text);
        const parsed = parseAnalysis(completion.text);
        if (!parsed.ok) {
          lastError = new AiError("invalid_output", parsed.error, true);
          continue;
        }
        const { value, removed } = scrubUnsupportedClaims(parsed.value);
        out.result = value;
        out.scrubbed = removed;
        if (value.confidence < AI_MIN_CONFIDENCE) return { ...out, status: "ok", errorCode: "low_confidence", error: `model confidence ${value.confidence.toFixed(2)} below ${AI_MIN_CONFIDENCE} — no recommendations surfaced` };
        const finding = analysisToFinding(value, evidence, issues.get(s.url) ?? [], s.pageType === "home", denominator);
        return { ...out, status: "ok", finding };
      } catch (err) {
        const e = err instanceof AiError ? err : new AiError("api_error", (err as Error).message, false);
        lastError = e;
        if (e.code === "auth" || e.code === "model_unavailable" || e.code === "no_api_key") {
          halted = { code: e.code, message: e.message };
          break;
        }
        if (!e.retryable) break;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    return { ...out, status: "unavailable", errorCode: lastError?.code ?? "api_error", error: lastError?.message ?? "unknown error" };
  };

  const queue = [...selected];
  const workers = Array.from({ length: Math.max(1, Math.min(opts.concurrency ?? 3, queue.length || 1)) }, async () => {
    for (;;) {
      const s = queue.shift();
      if (!s) return;
      outcomes.push(await analyseOne(s));
      done++;
      await opts.onProgress?.(done, selected.length, `${done}/${selected.length} pages analysed`);
    }
  });
  await Promise.all(workers);

  outcomes.sort((a, b) => selected.findIndex((s) => s.url === a.url) - selected.findIndex((s) => s.url === b.url));
  return { outcomes, findings: outcomes.map((o) => o.finding).filter((f): f is Finding => Boolean(f)), haltedBy: halted, durationMs: Date.now() - started };
}
