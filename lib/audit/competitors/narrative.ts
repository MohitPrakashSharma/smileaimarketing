import { completeJson, type OpenAiClientOptions } from "../ai/openaiClient";
import type { LocalComparison } from "./types";

/**
 * Optional plain-English explanation of a verified comparison, written by the
 * model from — and only from — the numbers and names in the comparison. The
 * output is validated before use: every number it mentions must appear in
 * the data, every practice it names must be one of the compared practices,
 * and it may not talk about rankings, patients, revenue or traffic. Anything
 * else is discarded and the deterministic text is used instead.
 */

export interface ComparisonNarrative {
  text: string;
  model: string;
  generatedAt: string;
}

const FORBIDDEN = /\b(rank|ranking|ranks|patients?|revenue|traffic|leads?|bookings?|customers?|conversion|market share|#\s?1|number one|guarantee|best (dental|practice)|worst)\b/i;

/** Numbers the model may use: every measured value in the comparison, in the forms the report prints them. */
export function allowedNumbers(cmp: LocalComparison): Set<string> {
  const out = new Set<string>();
  for (const e of [cmp.practice, ...cmp.competitors]) {
    const m = e.measurement;
    if (!m || m.status !== "ok") continue;
    for (const v of [m.performanceScore, m.accessibility, m.bestPractices, m.seo]) if (v !== null) out.add(String(v));
    if (m.lcpMs !== null) {
      out.add((m.lcpMs / 1000).toFixed(1));
      out.add(String(Math.round(m.lcpMs / 1000)));
    }
  }
  // Differences between two measured values are still "from the data" (e.g. "16 points higher").
  const scores: number[] = [];
  const secs: number[] = [];
  for (const e of [cmp.practice, ...cmp.competitors]) {
    const m = e.measurement;
    if (!m || m.status !== "ok") continue;
    for (const v of [m.performanceScore, m.accessibility, m.bestPractices, m.seo]) if (v !== null) scores.push(v);
    if (m.lcpMs !== null) secs.push(m.lcpMs / 1000);
  }
  for (let i = 0; i < scores.length; i++) for (let j = i + 1; j < scores.length; j++) out.add(String(Math.abs(scores[i] - scores[j])));
  for (let i = 0; i < secs.length; i++) for (let j = i + 1; j < secs.length; j++) {
    const d = Math.abs(secs[i] - secs[j]);
    out.add(d.toFixed(1));
    out.add(String(Math.round(d)));
  }
  out.add(String(cmp.competitors.length));
  out.add("100"); // "/100"
  out.add("2.5"); // Google's LCP target, quoted in the method text
  return out;
}

export function validateNarrative(text: string, cmp: LocalComparison): { ok: boolean; reason?: string } {
  if (!text || text.length < 40 || text.length > 900) return { ok: false, reason: "length" };
  if (FORBIDDEN.test(text)) return { ok: false, reason: `forbidden claim: ${text.match(FORBIDDEN)?.[0]}` };
  const allowed = allowedNumbers(cmp);
  for (const num of text.match(/\d+(?:\.\d+)?/g) ?? []) if (!allowed.has(num)) return { ok: false, reason: `number not in data: ${num}` };
  const names = [cmp.practice.name, ...cmp.competitors.map((c) => c.name)];
  // Any capitalised phrase that looks like a practice name must be one we compared.
  for (const phrase of text.match(/\b(?:[A-Z][\w'&-]+\s){1,4}(?:Dental|Dentistry|Clinic|Smiles?|Orthodontics|Kids|Children)\b/g) ?? []) {
    if (!names.some((n) => n.toLowerCase().includes(phrase.trim().toLowerCase()) || phrase.trim().toLowerCase().includes(n.toLowerCase()))) return { ok: false, reason: `unknown practice: ${phrase.trim()}` };
  }
  return { ok: true };
}

export async function generateComparisonNarrative(cmp: LocalComparison, client: OpenAiClientOptions): Promise<ComparisonNarrative | null> {
  if (!client.apiKey) return null;
  const rows = [cmp.practice, ...cmp.competitors].map((e) => {
    const m = e.measurement;
    if (!m || m.status !== "ok") return `${e.name}${e === cmp.practice ? " (the reader's practice)" : ""}: not measured (Google could not test the homepage)`;
    return `${e.name}${e === cmp.practice ? " (the reader's practice)" : ""}: performance ${m.performanceScore ?? "n/a"}/100, main content visible after ${m.lcpMs !== null ? (m.lcpMs / 1000).toFixed(1) + " s" : "n/a"}, accessibility ${m.accessibility ?? "n/a"}/100, best practices ${m.bestPractices ?? "n/a"}/100, Google SEO basics ${m.seo ?? "n/a"}/100`;
  });
  const system = "You write two or three plain sentences for a Canadian dental practice owner explaining how their homepage measured against nearby practices on Google PageSpeed Insights (mobile). Use ONLY the names and numbers provided; quote numbers exactly as given. Do not mention rankings, search positions, patients, revenue, traffic, leads, bookings or any outcome. Do not say any practice is 'better' overall — only which measured metric is higher or lower. Quote the values as given; do not compute percentages, averages or ratios. If a practice was not measured, say so plainly. Return JSON: {\"summary\": \"...\"}.";
  const user = `Practices and measurements (same test: Google PageSpeed Insights, mobile, homepage):\n${rows.join("\n")}\n\nMeasured differences already identified:\n${cmp.gaps.map((g) => `- ${g.sentence}`).join("\n") || "- none large enough to call out"}`;
  try {
    let feedback: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const messages = [{ role: "system" as const, content: system }, { role: "user" as const, content: feedback ? `${user}\n\nYour previous answer was rejected: ${feedback}. Write it again using only the names and numbers above.` : user }];
      const out = await completeJson(client, messages, 600);
      const parsed = JSON.parse(out.text) as { summary?: unknown };
      const text = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
      const v = validateNarrative(text, cmp);
      if (v.ok) return { text, model: out.model, generatedAt: new Date().toISOString() };
      console.warn(`[Local comparison] narrative rejected (${v.reason})${attempt === 0 ? " — retrying once" : ""}`);
      feedback = v.reason ?? "invalid";
    }
    return null;
  } catch (err) {
    console.warn(`[Local comparison] narrative unavailable: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}
