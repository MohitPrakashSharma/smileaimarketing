import { describe, it, expect } from "vitest";
import { parseAnalysis, scrubUnsupportedClaims, PageAnalysisSchema } from "@/lib/audit/ai/schema";
import { completeJson, AiError, type OpenAiFetchImpl } from "@/lib/audit/ai/openaiClient";
import { buildBoilerplateSet, cleanContent, buildPageEvidence } from "@/lib/audit/ai/evidence";
import { buildMessages } from "@/lib/audit/ai/prompt";
import { runAiStage } from "@/lib/audit/stages/ai";
import { selectRepresentativePages, classifyPage } from "@/lib/audit/pages/select";
import { crawlSite } from "@/lib/audit/core/crawler";
import { Fetcher } from "@/lib/audit/core/fetch";
import { buildCheckContext, runChecks } from "@/lib/audit/checks";
import { industryFromCategory } from "@/lib/industry";
import { makeFetch, testResolver, ALL_SITES, DUPLICATE, HEALTHY } from "../fixtures/sites";

const GOOD: Record<string, unknown> = {
  pageIntent: "Find an emergency plumber in Toronto who can come today",
  intentConfidence: 0.85,
  intentAlignment: "moderate",
  contentQualityObservations: ["The page names the service but never says how fast a plumber arrives."],
  topicalGaps: ["Response time and after-hours availability", "Which neighbourhoods are covered"],
  missingServiceInformation: ["Whether call-out fees apply", "Typical arrival window"],
  faqOpportunities: ["Do you charge extra for night call-outs?", "Is the work guaranteed?"],
  trustGaps: ["No licence number or insurance statement on the page"],
  conversionWeaknesses: ["The phone number appears only in the footer"],
  internalLinkOpportunities: ["Link to /services/emergency from the homepage hero"],
  titleSuggestion: "24/7 Emergency Plumber Toronto | Bright Plumbing",
  metaDescriptionSuggestion: "Burst pipe or flooded basement? Bright Plumbing reaches anywhere in Toronto within the hour, day or night. Call now for same-day emergency service.",
  headingRecommendations: ["Emergency plumbing in Toronto — on site within the hour", "What counts as a plumbing emergency"],
  contentStructureRecommendations: ["Put the phone number and arrival promise above the first paragraph"],
  recommendedSections: ["Service area — neighbourhoods and response times"],
  businessOwnerSummary: "This page tells people you handle emergencies but not how quickly or where. Adding arrival times, coverage and pricing basics gives a panicking homeowner what they need to call you first.",
  developerNotes: ["Add FAQPage schema once the FAQ section exists"],
  confidence: 0.8,
};

/** OpenAI mock: sequence of responses; each item is a body, an HTTP error, or a hang. */
type Step = { json?: unknown; text?: string; status?: number; error?: { message: string; code?: string; param?: string }; hang?: boolean };
function makeOpenAi(steps: Step[], log: Array<Record<string, unknown>> = []): { fetchImpl: OpenAiFetchImpl; log: Array<Record<string, unknown>> } {
  let i = 0;
  const fetchImpl: OpenAiFetchImpl = async (_url, init) => {
    log.push(JSON.parse(init.body));
    const step = steps[Math.min(i++, steps.length - 1)];
    if (step.hang) return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
    if (step.error) return new Response(JSON.stringify({ error: step.error }), { status: step.status ?? 500, headers: { "content-type": "application/json" } });
    const content = step.text ?? JSON.stringify(step.json);
    return new Response(JSON.stringify({ model: "test-model", choices: [{ message: { content } }], usage: { prompt_tokens: 2500, completion_tokens: 600 } }), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { fetchImpl, log };
}

async function ctxFor(url = "https://healthy.test", site = ALL_SITES, category = "Plumbing Company") {
  const { fetchImpl } = makeFetch(site);
  const crawl = await crawlSite(new Fetcher(fetchImpl, testResolver), url, { budget: { concurrency: 2, politenessDelayMs: 1 } });
  const ctx = buildCheckContext(crawl, { name: "Bright Plumbing", city: "Toronto", industry: industryFromCategory(category) }, new URL(crawl.seedUrl).hostname);
  return { ctx, runs: runChecks(ctx) };
}

describe("structured output schema", () => {
  it("accepts a valid response and strips hallucinated ranking/volume fields", () => {
    const r = parseAnalysis(JSON.stringify({ ...GOOD, rankingPosition: 18, monthlySearchVolume: 2400, competitorTraffic: "high" }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect("rankingPosition" in r.value).toBe(false);
      expect("monthlySearchVolume" in r.value).toBe(false);
      expect(r.value.titleSuggestion).toBe(GOOD.titleSuggestion);
    }
  });
  it("rejects malformed JSON and schema-invalid data", () => {
    expect(parseAnalysis("not json {").ok).toBe(false);
    expect(parseAnalysis(JSON.stringify({ ...GOOD, intentAlignment: "excellent" })).ok).toBe(false);
    expect(parseAnalysis(JSON.stringify({ ...GOOD, confidence: 7 })).ok).toBe(false);
    expect(parseAnalysis(JSON.stringify({ ...GOOD, topicalGaps: "not a list" })).ok).toBe(false);
  });
  it("tolerates partial output by defaulting optional arrays", () => {
    const r = parseAnalysis("```json\n" + JSON.stringify({ pageIntent: "x", confidence: 0.6, businessOwnerSummary: "ok" }) + "\n```");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.topicalGaps).toEqual([]);
      expect(r.value.intentAlignment).toBe("unknown");
      expect(r.value.titleSuggestion).toBeNull();
    }
  });
  it("trims over-long lists and strings instead of rejecting the analysis", () => {
    const r = PageAnalysisSchema.safeParse({ ...GOOD, topicalGaps: Array(9).fill("x"), businessOwnerSummary: "word ".repeat(300) });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.topicalGaps).toHaveLength(6);
      expect(r.data.businessOwnerSummary.length).toBeLessThanOrEqual(700);
    }
  });
});

describe("unsupported-claim scrubbing", () => {
  it("removes sentences asserting rankings, volumes, traffic, backlinks, CWV numbers and penalties — keeps the rest", () => {
    const a = PageAnalysisSchema.parse({
      ...GOOD,
      businessOwnerSummary: "You currently rank #18 for emergency plumber Toronto. The page explains the service well. This keyword gets 2,400 searches per month. Competitors receive more organic traffic than you. Your LCP is 4.2s according to Core Web Vitals. Google has applied a penalty. Adding response times will help.",
      topicalGaps: ["Service area coverage", "You have only 12 backlinks so authority is low", "Domain authority of 15 is holding you back"],
      contentQualityObservations: ["Search Console shows 300 impressions", "The copy is generic"],
    });
    const { value, removed } = scrubUnsupportedClaims(a);
    expect(value.businessOwnerSummary).toBe("The page explains the service well. Adding response times will help.");
    expect(value.topicalGaps).toEqual(["Service area coverage"]);
    expect(value.contentQualityObservations).toEqual(["The copy is generic"]);
    expect(removed.length).toBe(8);
    expect(removed.map((r) => r.path)).toEqual(expect.arrayContaining(["businessOwnerSummary", "topicalGaps", "contentQualityObservations"]));
  });
  it("drops over-long title/meta suggestions instead of truncating", () => {
    const { value, removed } = scrubUnsupportedClaims(PageAnalysisSchema.parse({ ...GOOD, titleSuggestion: "x".repeat(90), metaDescriptionSuggestion: "y".repeat(200) }));
    expect(value.titleSuggestion).toBeNull();
    expect(value.metaDescriptionSuggestion).toBeNull();
    expect(removed.some((r) => r.pattern === "over 70 chars")).toBe(true);
  });
});

describe("OpenAI client", () => {
  const msgs = [{ role: "system" as const, content: "s" }, { role: "user" as const, content: "u" }];
  it("requires an API key", async () => {
    await expect(completeJson({ apiKey: undefined, model: "m" }, msgs)).rejects.toMatchObject({ code: "no_api_key" });
  });
  it("reports a rejected model with the API's exact message and never substitutes", async () => {
    const { fetchImpl, log } = makeOpenAi([{ status: 404, error: { message: "The model `gpt-does-not-exist` does not exist or you do not have access to it.", code: "model_not_found" } }]);
    const err = (await completeJson({ apiKey: "k", model: "gpt-does-not-exist", fetchImpl }, msgs).catch((e) => e)) as AiError;
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe("model_unavailable");
    expect(err.message).toContain("gpt-does-not-exist");
    expect(err.message).toContain("does not exist");
    expect(log[0].model).toBe("gpt-does-not-exist");
    expect(log.length).toBe(1);
  });
  it("classifies auth, rate limit, server error and timeout", async () => {
    await expect(completeJson({ apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ status: 401, error: { message: "Incorrect API key provided" } }]).fetchImpl }, msgs)).rejects.toMatchObject({ code: "auth" });
    await expect(completeJson({ apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ status: 429, error: { message: "Rate limit" } }]).fetchImpl }, msgs)).rejects.toMatchObject({ code: "rate_limited", retryable: true });
    await expect(completeJson({ apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ status: 503, error: { message: "overloaded" } }]).fetchImpl }, msgs)).rejects.toMatchObject({ code: "api_error", retryable: true });
    await expect(completeJson({ apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ hang: true }]).fetchImpl, timeoutMs: 30 }, msgs)).rejects.toMatchObject({ code: "timeout" });
  });
  it("never puts the key anywhere but the Authorization header", async () => {
    const seen: string[] = [];
    const fetchImpl: OpenAiFetchImpl = async (_u, init) => {
      seen.push(init.headers.Authorization, init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), { status: 200 });
    };
    await completeJson({ apiKey: "sk-secret-123", model: "m", fetchImpl }, msgs);
    expect(seen[0]).toBe("Bearer sk-secret-123");
    expect(seen[1]).not.toContain("sk-secret-123");
  });
});

describe("evidence building", () => {
  it("removes boilerplate repeated across pages (even unpunctuated nav strips) and caps huge content", () => {
    const nav = "Skip to main content Home Services About Us Contact Call us today for a free quote";
    const footer = "We accept all major credit cards and offer financing on every job";
    const pages = Array.from({ length: 6 }, (_, i) => ({ facts: { mainText: `${nav} Page ${i} unique sentence about ${"topic ".repeat(3)}${i}. ${footer}` } })) as never;
    const bp = buildBoilerplateSet(pages);
    expect(bp.size).toBeGreaterThan(0);
    const cleaned = cleanContent(`${nav} Unique text here about drains. ${footer}`, bp);
    expect(cleaned.content).toBe("Unique text here about drains.");
    const huge = cleanContent(Array.from({ length: 5000 }, (_, i) => `w${i}`).join(" "), new Set());
    expect(huge.truncated).toBe(true);
    expect(huge.wordsSent).toBe(1600);
    expect(huge.content).toContain("[…]");
  });
  it("packs the crawler facts and deterministic issues for the page, without HTML", async () => {
    const { ctx, runs } = await ctxFor("https://thin.test");
    const page = ctx.htmlPages.find((p) => p.url === "https://thin.test/services")!;
    const ev = buildPageEvidence(page, "service", "test", ctx, runs, new Set());
    expect(ev.page.deterministicIssues.map((i) => i.checkId)).toEqual(expect.arrayContaining(["content.thin_page", "content.meta.missing", "content.h1.missing"]));
    expect(ev.page.content).not.toMatch(/<[a-z]+/);
    expect(ev.business).toEqual({ name: "Bright Plumbing", industry: "Plumbing Company", customersNoun: "customers", city: "Toronto" });
    const m = buildMessages(ev);
    expect(m[0].content).toContain("NEVER state or estimate");
    expect(m[0].content).toContain('"customers"');
    expect(m[1].content).not.toMatch(/OPENAI|DATABASE_URL|sk-/);
  });
});

describe("page selection", () => {
  it("classifies and picks representative pages, skipping duplicates and legal pages", async () => {
    const { ctx, runs } = await ctxFor("https://dup.test", DUPLICATE, "Roofing Company");
    const sel = selectRepresentativePages(ctx, { max: 8, issuesByUrl: new Map(), includeIssuePages: true });
    const urls = sel.map((s) => s.url);
    expect(urls[0]).toBe("https://dup.test/");
    // three identical city pages → only one survives
    expect(urls.filter((u) => /toronto|mississauga|brampton/.test(u))).toHaveLength(1);
    expect(sel.every((s) => s.reason.length > 0)).toBe(true);
    expect(classifyPage(ctx.htmlPages.find((p) => p.url.endsWith("/contact"))!, ctx)).toBe("conversion");
    expect(classifyPage(ctx.htmlPages.find((p) => p.url.endsWith("/toronto"))!, ctx)).toBe("location");
    expect(runs.length).toBeGreaterThan(0);
  });
});

describe("AI stage", () => {
  it("valid response → one OPPORTUNITY finding per page with provenance, tokens recorded, no score impact", async () => {
    const { ctx, runs } = await ctxFor();
    const { fetchImpl, log } = makeOpenAi([{ json: GOOD }]);
    const res = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "test-model", fetchImpl }, maxPages: 3 });
    expect(res.outcomes.filter((o) => o.status === "ok")).toHaveLength(3);
    expect(res.findings).toHaveLength(3);
    const f = res.findings.find((x) => x.affectedUrls[0] === "https://healthy.test/services")!;
    expect(f.severity).toBe("OPPORTUNITY");
    expect(f.source).toBe("openai");
    expect(f.evidenceKind).toBe("AI_INFERRED_OPPORTUNITY");
    expect(f.confidence).toBeLessThanOrEqual(70);
    expect(f.checkIds[0]).toBe("ai.page_analysis");
    expect(f.recommendedFix).toContain("Whether call-out fees apply");
    expect(f.developerDetails.find((d) => d.checkId === "ai.titleMeta")?.fix).toContain("24/7 Emergency Plumber Toronto");
    expect(res.outcomes[0].inputTokens).toBe(2500);
    expect(res.outcomes[0].evidence?.page.url).toBe("https://healthy.test/");
    expect(log[0].response_format).toEqual({ type: "json_object" });
    expect(log[0].model).toBe("test-model");
  });
  it("malformed then valid → retried once; malformed twice → unavailable, audit continues", async () => {
    const { ctx, runs } = await ctxFor();
    const a = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ text: "Sure! Here you go: {" }, { json: GOOD }]).fetchImpl }, maxPages: 1 });
    expect(a.outcomes[0].status).toBe("ok");
    const b = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ text: "nope" }]).fetchImpl }, maxPages: 1 });
    expect(b.outcomes[0]).toMatchObject({ status: "unavailable", errorCode: "invalid_output" });
    expect(b.findings).toEqual([]);
  });
  it("schema-invalid output → unavailable", async () => {
    const { ctx, runs } = await ctxFor();
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ json: { ...GOOD, intentAlignment: "great" } }]).fetchImpl }, maxPages: 1 });
    expect(r.outcomes[0].errorCode).toBe("invalid_output");
  });
  it("timeout and API errors → unavailable with reason", async () => {
    const { ctx, runs } = await ctxFor();
    const t = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ hang: true }]).fetchImpl, timeoutMs: 30 }, maxPages: 1 });
    expect(t.outcomes[0]).toMatchObject({ status: "unavailable", errorCode: "timeout" });
    const e = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ status: 500, error: { message: "boom" } }]).fetchImpl }, maxPages: 1 });
    expect(e.outcomes[0]).toMatchObject({ status: "unavailable", errorCode: "api_error" });
  });
  it("missing API key → every page unavailable, no network call, stage halted", async () => {
    const { ctx, runs } = await ctxFor();
    const { fetchImpl, log } = makeOpenAi([{ json: GOOD }]);
    const r = await runAiStage(ctx, runs, { client: { apiKey: undefined, model: "m", fetchImpl }, maxPages: 3 });
    expect(r.haltedBy?.code).toBe("no_api_key");
    expect(r.outcomes.every((o) => o.errorCode === "no_api_key")).toBe(true);
    expect(log).toHaveLength(0);
  });
  it("unsupported model → halts after the first call with the exact API error", async () => {
    const { ctx, runs } = await ctxFor();
    const { fetchImpl, log } = makeOpenAi([{ status: 404, error: { message: "The model `nope-1` does not exist" } }]);
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "nope-1", fetchImpl }, maxPages: 3, concurrency: 1 });
    expect(r.haltedBy?.code).toBe("model_unavailable");
    expect(r.haltedBy?.message).toContain("nope-1");
    expect(log).toHaveLength(1);
    expect(r.outcomes.every((o) => o.errorCode === "model_unavailable")).toBe(true);
  });
  it("empty content pages are skipped without a call; huge pages are truncated", async () => {
    const site = { ...HEALTHY, "https://healthy.test/about": { headers: { "content-type": "text/html" }, body: `<!DOCTYPE html><html lang="en"><head><title>About Bright Plumbing — the team</title><meta name="description" content="About us page description that is long enough for the checks."></head><body><main><h1>About</h1><p>${"word ".repeat(6000)}</p></main></body></html>` }, "https://healthy.test/services/emergency": { headers: { "content-type": "text/html" }, body: `<!DOCTYPE html><html lang="en"><head><title>Emergency</title></head><body><main><h1>Emergency</h1><p>Call.</p></main></body></html>` } };
    const { ctx, runs } = await ctxFor("https://healthy.test", site);
    const { fetchImpl, log } = makeOpenAi([{ json: GOOD }]);
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl }, maxPages: 8 });
    const empty = r.outcomes.find((o) => o.url.endsWith("/services/emergency"));
    expect(empty).toMatchObject({ status: "skipped", errorCode: "empty_content" });
    const huge = r.outcomes.find((o) => o.url.endsWith("/about"))!;
    expect(huge.evidence?.page.contentTruncated).toBe(true);
    expect(huge.evidence?.page.contentWordsSent).toBe(1600);
    expect(log.length).toBe(r.outcomes.filter((o) => o.status === "ok").length);
  });
  it("duplicate pages are analysed once; boilerplate is stripped from the evidence", async () => {
    const { ctx, runs } = await ctxFor("https://dup.test", DUPLICATE, "Roofing Company");
    const { fetchImpl } = makeOpenAi([{ json: GOOD }]);
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl }, maxPages: 8 });
    expect(r.outcomes.filter((o) => /toronto|mississauga|brampton/.test(o.url))).toHaveLength(1);
    const ev = r.outcomes.find((o) => o.url === "https://dup.test/")!.evidence!;
    expect(ev.page.content.length).toBeGreaterThan(50);
  });
  it("hallucinated fields and unsupported claims cannot reach the finding", async () => {
    const { ctx, runs } = await ctxFor();
    const bad = { ...GOOD, rankingPosition: 3, businessOwnerSummary: "You rank #3 on Google for plumber Toronto. The page lacks arrival times.", conversionWeaknesses: ["Your conversion rate is 1.2% which is low", "The phone number is only in the footer"] };
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ json: bad }]).fetchImpl }, maxPages: 1 });
    const f = r.findings[0];
    expect(JSON.stringify(f)).not.toMatch(/rank #3|conversion rate|rankingPosition/);
    expect(f.whyItMatters).toContain("The page lacks arrival times.");
    expect(r.outcomes[0].scrubbed.length).toBe(2);
  });
  it("low-confidence analysis is stored but produces no finding", async () => {
    const { ctx, runs } = await ctxFor();
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ json: { ...GOOD, confidence: 0.2 } }]).fetchImpl }, maxPages: 1 });
    expect(r.outcomes[0]).toMatchObject({ status: "ok", errorCode: "low_confidence" });
    expect(r.outcomes[0].result?.confidence).toBe(0.2);
    expect(r.findings).toEqual([]);
  });
  it("partial output with nothing actionable → no finding, still ok", async () => {
    const { ctx, runs } = await ctxFor();
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl: makeOpenAi([{ json: { pageIntent: "x", confidence: 0.7, businessOwnerSummary: "Fine." } }]).fetchImpl }, maxPages: 1 });
    expect(r.outcomes[0].status).toBe("ok");
    expect(r.findings).toEqual([]);
  });
  it("disabled → skipped rows, no calls", async () => {
    const { ctx, runs } = await ctxFor();
    const { fetchImpl, log } = makeOpenAi([{ json: GOOD }]);
    const r = await runAiStage(ctx, runs, { client: { apiKey: "k", model: "m", fetchImpl }, maxPages: 2, enabled: false });
    expect(r.outcomes.every((o) => o.status === "skipped")).toBe(true);
    expect(log).toHaveLength(0);
  });
});

describe("OpenAI parameter negotiation", () => {
  const msgs = [{ role: "system" as const, content: "s" }, { role: "user" as const, content: "u" }];
  it("drops an unsupported parameter and retries — without changing the model", async () => {
    const { fetchImpl, log } = makeOpenAi([
      { status: 400, error: { message: "Unsupported parameter: 'max_completion_tokens' is not supported with this model." } },
      { status: 400, error: { message: "Unsupported value: 'temperature' does not support 0.2 with this model. Only the default (1) value is supported." } },
      { json: GOOD },
    ]);
    const r = await completeJson({ apiKey: "k", model: "gpt-5.6-luna", fetchImpl }, msgs);
    expect(r.text).toContain("pageIntent");
    expect(log).toHaveLength(3);
    expect(log[0]).toHaveProperty("max_completion_tokens");
    expect(log[1]).not.toHaveProperty("max_completion_tokens");
    expect(log[2]).not.toHaveProperty("temperature");
    expect(log.every((b) => b.model === "gpt-5.6-luna")).toBe(true);
  });
  it("raises the completion cap when a reasoning model truncates, then succeeds", async () => {
    const fetchImpl: OpenAiFetchImpl = async (_u, init) => {
      const body = JSON.parse(init.body);
      log.push(body);
      const content = body.max_completion_tokens >= 8000 ? JSON.stringify(GOOD) : "";
      return new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: content ? "stop" : "length" }] }), { status: 200 });
    };
    const log: Array<Record<string, unknown>> = [];
    const r = await completeJson({ apiKey: "k", model: "m", fetchImpl }, msgs);
    expect(r.text).toContain("pageIntent");
    expect(log.map((b) => b.max_completion_tokens)).toEqual([4000, 8000]);
  });
  it("still reports a genuinely unknown model with the API's message", async () => {
    const { fetchImpl } = makeOpenAi([{ status: 400, error: { message: "The model `gpt-9` does not exist or you do not have access to it.", code: "model_not_found", param: "model" } }]);
    await expect(completeJson({ apiKey: "k", model: "gpt-9", fetchImpl }, msgs)).rejects.toMatchObject({ code: "model_unavailable" });
  });
});
