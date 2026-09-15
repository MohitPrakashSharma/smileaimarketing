/**
 * Minimal OpenAI chat-completions client for structured JSON output.
 *
 *  - Reads the key/model from the caller (the engine passes env values);
 *    never logs or echoes the key.
 *  - Classifies failures so the stage can decide: auth/model errors stop the
 *    whole stage (no point retrying per page); rate limits / 5xx / invalid
 *    output get one retry; timeouts are bounded.
 *  - A rejected model is reported with the API's exact error message and is
 *    never substituted.
 *  - `fetchImpl` is injectable so tests never touch the network.
 */

export type AiErrorCode = "no_api_key" | "model_unavailable" | "auth" | "rate_limited" | "timeout" | "api_error" | "invalid_output";

export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string, public retryable = false) {
    super(message);
    this.name = "AiError";
  }
}

export type OpenAiFetchImpl = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }) => Promise<Response>;

export interface OpenAiClientOptions {
  apiKey: string | undefined;
  model: string;
  fetchImpl?: OpenAiFetchImpl;
  timeoutMs?: number;
  endpoint?: string;
}

export interface JsonCompletion {
  text: string;
  inputTokens: number | null;
  outputTokens: number | null;
  model: string;
}

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * Request parameters that differ between model generations. When the API
 * answers 400 "Unsupported parameter: 'x'" / "Unsupported value: 'x'", that
 * one parameter is dropped and the request is retried once. The model is
 * never changed — only the optional knobs around it.
 */
type RequestParams = { temperature?: number; max_completion_tokens?: number; response_format?: { type: "json_object" } };

/** Reasoning models spend completion tokens thinking before they answer; the cap must leave room for both. */
export const DEFAULT_MAX_COMPLETION_TOKENS = 4000;
const MAX_COMPLETION_TOKENS_CEILING = 12_000;

export async function completeJson(opts: OpenAiClientOptions, messages: Array<{ role: "system" | "user"; content: string }>, maxTokens = DEFAULT_MAX_COMPLETION_TOKENS): Promise<JsonCompletion> {
  if (!opts.apiKey) throw new AiError("no_api_key", "OPENAI_API_KEY is not configured");
  const params: RequestParams = { response_format: { type: "json_object" }, temperature: 0.2, max_completion_tokens: maxTokens };
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await requestOnce(opts, messages, params);
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      const unsupported = err.code === "api_error" ? err.message.match(/Unsupported (?:parameter|value): '([a-z_]+)'/i) : null;
      const key = unsupported?.[1] as keyof RequestParams | undefined;
      if (key && key in params) {
        delete params[key];
        continue;
      }
      // Truncated by the completion cap (reasoning used it up) → give it more room, once or twice.
      if (err.code === "invalid_output" && /finish_reason=length/.test(err.message) && params.max_completion_tokens && params.max_completion_tokens < MAX_COMPLETION_TOKENS_CEILING) {
        params.max_completion_tokens = Math.min(MAX_COMPLETION_TOKENS_CEILING, params.max_completion_tokens * 2);
        continue;
      }
      throw err;
    }
  }
  throw new AiError("api_error", "OpenAI request could not be negotiated");
}

async function requestOnce(opts: OpenAiClientOptions, messages: Array<{ role: "system" | "user"; content: string }>, params: RequestParams): Promise<JsonCompletion> {
  const fetchImpl = opts.fetchImpl ?? ((u, init) => fetch(u, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);
  try {
    const res = await fetchImpl(opts.endpoint ?? DEFAULT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${opts.apiKey}` },
      body: JSON.stringify({ model: opts.model, messages, ...params }),
      signal: controller.signal,
    });
    let body: Record<string, unknown> | null = null;
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      body = null;
    }
    if (!res.ok) {
      const err = (body?.error ?? {}) as { message?: string; code?: string; type?: string; param?: string };
      const message = err.message ?? `HTTP ${res.status}`;
      if (res.status === 401 || res.status === 403) throw new AiError("auth", `OpenAI authentication failed: ${message}`);
      const modelProblem = err.code === "model_not_found" || err.param === "model" || /\bmodel\b.*\b(does not exist|not found|do not have access|is not available|deprecated|unsupported model)\b/i.test(message) || (res.status === 404 && /model/i.test(message));
      if (modelProblem) throw new AiError("model_unavailable", `OpenAI rejected model "${opts.model}": ${message}`);
      if (res.status === 429) throw new AiError("rate_limited", `OpenAI rate limit: ${message}`, true);
      if (res.status >= 500) throw new AiError("api_error", `OpenAI server error ${res.status}: ${message}`, true);
      throw new AiError("api_error", `OpenAI error ${res.status}: ${message}`);
    }
    const choice = (body?.choices as Array<{ message?: { content?: string }; finish_reason?: string }> | undefined)?.[0];
    const text = choice?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      const reason = choice?.finish_reason ?? "unknown";
      throw new AiError("invalid_output", `OpenAI returned an empty completion (finish_reason=${reason}${reason === "length" ? `, cap ${params.max_completion_tokens ?? "default"} tokens` : ""})`, true);
    }
    if (choice?.finish_reason === "length") throw new AiError("invalid_output", `OpenAI output was cut off (finish_reason=length, cap ${params.max_completion_tokens ?? "default"} tokens)`, true);
    const usage = (body?.usage ?? {}) as { prompt_tokens?: number; completion_tokens?: number };
    return {
      text,
      inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : null,
      outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : null,
      model: typeof body?.model === "string" ? (body.model as string) : opts.model,
    };
  } catch (err) {
    if (err instanceof AiError) throw err;
    const e = err as Error;
    if (e.name === "AbortError") throw new AiError("timeout", `OpenAI request timed out after ${opts.timeoutMs ?? 45_000} ms`, true);
    throw new AiError("api_error", e.message || "network error", true);
  } finally {
    clearTimeout(timer);
  }
}
