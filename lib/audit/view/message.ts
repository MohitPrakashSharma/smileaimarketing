import { measuredSummary, type FindingLike } from "./findingView";
import { buildPerformanceView, type PerfRow } from "./performanceView";

/**
 * "A message for <business>" — the short personal note on the first page of
 * the customer PDF (not shown on the web report). Built deterministically from
 * the stored audit (no AI call, no randomness), so the same completed audit
 * always reads the same and every sentence traces to a stored number; ~100–130
 * words: scope, headline numbers, the problems that matter most with their
 * measurements, the recommended order, and an invitation to read on. Findings
 * are described as measurements, never as lost patients, rankings or revenue.
 */

export interface MessageFinding {
  id: string;
  pillar: string;
  severity: string;
  title: string;
  affectedPageCount: number;
  detectedValue: string | null;
  developerDetails: FindingLike["developerDetails"];
  recommendedFix: string;
  whyItMatters: string;
  device: string | null;
  owner: string;
}

export interface MessageInput {
  businessName: string;
  website: string;
  /** e.g. "patients" — the industry's word for customers. */
  customersWord: string;
  pagesCrawled: number;
  checksRun: number;
  scores: { overall: number | null; technical: number | null; content: number | null; performance: number | null; search: number | null; local: number | null } | null;
  severityCounts: Record<string, number>;
  findings: MessageFinding[];
  performance: PerfRow[];
}

export interface BusinessMessage {
  heading: string;
  paragraphs: string[];
  wordCount: number;
}

const n = (v: number, one: string, many = `${one}s`) => `${v} ${v === 1 ? one : many}`;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const toLike = (f: MessageFinding): FindingLike => ({ title: f.title, affectedPageCount: f.affectedPageCount, detectedValue: f.detectedValue, developerDetails: f.developerDetails, recommendedFix: f.recommendedFix, whyItMatters: f.whyItMatters, device: f.device });

/**
 * Evidence for one finding in plain words. Performance findings already carry a
 * humanised measurement ("Main content takes 13 s to appear on mobile …");
 * crawler findings are summarised from their checks ("titles too long or too
 * short (4 pages), no meta description (6 pages)").
 */
export function plainEvidence(f: MessageFinding, pagesCrawled: number): string {
  const like = toLike(f);
  if (f.pillar === "PERFORMANCE" || f.device) return measuredSummary(like, pagesCrawled || null).replace(/\s*·\s*\+\d+ related checks?$/, "");
  const details = (f.developerDetails ?? []).filter((d) => d.affectedPageCount > 0).slice(0, 2);
  if (details.length) return details.map((d) => `${lower(d.title)} (${n(d.affectedPageCount, "page")})`).join(", ");
  return measuredSummary(like, pagesCrawled || null).replace(/\s*·\s*\+\d+ related checks?$/, "");
}

export function buildBusinessMessage(i: MessageInput): BusinessMessage {
  // Three problems when the titles are short enough, otherwise two — keeps the note near 100–130 words, deterministically.
  const three = compose(i, 3);
  return three.wordCount > 135 ? compose(i, 2) : three;
}

function compose(i: MessageInput, maxProblems: number): BusinessMessage {
  const { scores, severityCounts: sc, findings } = i;
  const paragraphs: string[] = [];
  const site = host(i.website);
  const perf = buildPerformanceView(i.performance);
  const testedPages = perf.pages.length;

  // Scope + headline numbers
  let scope = `We crawled ${n(i.pagesCrawled, "page")} of ${site} and ran ${n(i.checksRun, "check")}`;
  if (testedPages > 0) scope += `, plus Google PageSpeed tests on ${n(testedPages, "page")}`;
  const crit = sc.CRITICAL ?? 0;
  const high = sc.HIGH ?? 0;
  const counts = [crit ? `${crit} critical` : null, high ? `${high} high-priority` : null].filter(Boolean).join(", ");
  const result = findings.length
    ? `${scores?.overall != null ? `The site scores ${scores.overall}/100 (our SEO health score), with` : "We verified"} ${n(findings.length, "verified finding")}${counts ? ` (${counts})` : ""}.`
    : `${scores?.overall != null ? `The site scores ${scores.overall}/100 (our SEO health score) and n` : "N"}o issue crossed our thresholds.`;
  paragraphs.push(`Thank you for auditing ${i.businessName} with us. ${scope}. ${result}`);

  // The problems that matter most, with their measurements
  const top = findings.slice(0, maxProblems);
  if (top.length) {
    paragraphs.push(`What matters most: ${top.map((f) => `${f.title} — ${plainEvidence(f, i.pagesCrawled)}.`).join(" ")}`);
    const order = top.slice(0, 2).map((f) => `\u201c${f.title}\u201d`);
    const who = top[0].owner === "developer" ? " (a developer job)" : "";
    paragraphs.push(`Start with ${order[0]}${who}${order[1] ? `, then ${order[1]}` : ""}. These are measurements from the audit date, not predictions of ${i.customersWord} or search positions; the action plan and findings that follow explain each fix.`);
  } else {
    paragraphs.push("The findings that follow list everything we checked and how the site measured on the audit date.");
  }

  const wordCount = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return { heading: `A message for ${i.businessName}`, paragraphs, wordCount };
}
