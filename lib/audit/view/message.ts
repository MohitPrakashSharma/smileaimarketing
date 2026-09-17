import { measuredSummary, type FindingLike } from "./findingView";
import type { PerfRow } from "./performanceView";

/**
 * "A message for <business>" — the short personal note on the first page of
 * the customer PDF (not shown on the web report). Built deterministically from
 * the stored audit (no AI call, no randomness), so the same completed audit
 * always reads the same and every sentence traces to a stored number; ~100–130
 * words: practice and scope, the verified findings and their severity, the two
 * or three problems that matter most with their measurements, what leaving
 * them unresolved tends to mean for visitors and search visibility, and a
 * recommendation to book a website review. Findings are described as
 * measurements, never as lost patients, rankings or revenue; an unmeasured
 * area (PageSpeed unavailable, no CrUX data) is never held against the site.
 */

export interface MessageFinding {
  id: string;
  /** Finding group key (e.g. "perf_mobile_load", "page:/about") — picks the specific implication sentence. */
  findingKey?: string;
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
  // Two problems when their measurements are short enough, else one — keeps the note near 100–130 words, deterministically.
  const two = compose(i, 2);
  return two.wordCount <= 135 ? two : compose(i, 1);
}

/**
 * What a specific verified problem means for the visitor or the practice —
 * phrased as the mechanism the finding actually measures, never as lost
 * patients, rankings or revenue. Keyed by finding group, with an area-level
 * fallback.
 */
const IMPLICATION_BY_KEY: Record<string, string> = {
  perf_mobile_load: "A slow first load on a phone gives a visitor a reason to leave before your services appear.",
  perf_lcp: "Visitors wait for the page's main content before they can read anything.",
  perf_js_main_thread: "Taps and scrolls lag while scripts run, so the page feels broken on a phone.",
  perf_layout_shift: "Content that jumps while loading makes visitors tap the wrong thing.",
  perf_caching: "Every repeat visit downloads files that the browser could have kept.",
  perf_third_party: "Third-party scripts slow every page for every visitor.",
  perf_desktop: "Even on a fast connection the page itself is heavy.",
  conversion_path: "A visitor who is ready to book has to hunt for a way to call or contact you.",
  trust_signals: "Visitors and Google cannot easily see who is behind the site or how to reach you.",
  indexability: "Search engines may not show the affected pages at all.",
  broken_pages_links: "Visitors and search engines hit dead ends on your own site.",
  sitemap_robots: "Search engines get a poor map of your site, so new pages are found more slowly.",
  titles_descriptions: "Your listing in Google results reads worse than it could, on every affected page.",
  headings: "Search engines get a muddled outline of what each page is about.",
  thin_duplicate_content: "Search engines have very little text to understand those pages by.",
  images_alt: "Search engines and screen readers cannot tell what your images show.",
  images_size: "Pages jump and load slower than they need to.",
  internal_linking: "Your own pages do not point search engines at what matters.",
  structured_data: "Google is not told plainly what the practice is, where it is and when it is open.",
  https_security: "Browsers can warn visitors away before they see the site.",
  mobile_html: "Google evaluates the mobile version of every page first, and the basics are missing.",
  js_rendering: "Search engines and link previews can see an empty page.",
  site_structure: "Buried pages look unimportant to search engines and are crawled less often.",
  unreachable: "Nothing else in this report matters until the site loads.",
};
const IMPLICATION_BY_PILLAR: Record<string, string> = {
  CONTENT: "It makes the affected pages harder for visitors and search engines to understand.",
  TECHNICAL: "It can stop search engines from finding or trusting the affected pages.",
  PERFORMANCE: "It gives visitors on a phone a reason to leave before they find what they need.",
  CONVERSION: "It makes it harder for a visitor to take the next step.",
  LOCAL: "It makes the practice harder to find for nearby searches.",
  SEARCH: "It limits how often the practice appears in search.",
};
const AREA_WORD: Record<string, string> = { CONTENT: "on-page content", TECHNICAL: "technical health", PERFORMANCE: "page speed", CONVERSION: "the patient journey", LOCAL: "local visibility", SEARCH: "search visibility" };

function implication(f: MessageFinding): string {
  const key = f.findingKey ?? "";
  const base = key.replace(/^page:.*$/, "page");
  if (base === "page") return "One of your main pages is missing several on-page basics at once.";
  return IMPLICATION_BY_KEY[base] ?? IMPLICATION_BY_PILLAR[f.pillar] ?? "";
}

function compose(i: MessageInput, maxProblems: number): BusinessMessage {
  const { scores, severityCounts: sc, findings } = i;
  const paragraphs: string[] = [];
  const site = host(i.website);
  const crit = sc.CRITICAL ?? 0;
  const high = sc.HIGH ?? 0;
  const counts = [crit ? `${crit} critical` : null, high ? `${high} high-priority` : null].filter(Boolean).join(" and ");
  const total = `${n(findings.length, "verified finding")}${counts ? ` (${counts})` : ""}`;

  // Verdict from the measured pillars only — an unmeasured area (PageSpeed
  // unavailable during the audit) is never described as a weakness.
  const measured = (["technical", "content", "performance"] as const).filter((k) => scores && scores[k] !== null).map((k) => ({ key: k, score: scores![k] as number }));
  const weak = measured.filter((m) => m.score < 60).map((m) => AREA_WORD[m.key.toUpperCase()]);
  const technical = scores?.technical ?? null;
  const overall = scores?.overall ?? null;
  let verdict: string;
  if (!findings.length) verdict = "No issue crossed our thresholds — a strong result on the checks we ran.";
  else if (crit > 0 || high >= 3) verdict = `Your website has issues that deserve attention now: ${total}.`;
  else if (technical !== null && technical >= 80 && weak.length && !weak.includes("technical health")) verdict = `Your technical foundation is solid, but ${weak.join(" and ")} need${weak.length === 1 ? "s" : ""} work: ${total}.`;
  else if (overall !== null && overall >= 80) verdict = `The site is in good shape overall, with ${total} worth attending to.`;
  else verdict = `Our audit found ${total} that deserve attention.`;
  paragraphs.push(`${i.businessName}: our audit crawled ${n(i.pagesCrawled, "page")} of ${site} and ran ${n(i.checksRun, "check")}. ${verdict}`);

  // The most consequential problem (severity first), what it means, and a second one when the evidence supports it.
  const [first, second] = findings.slice(0, maxProblems);
  if (first) {
    const imp = implication(first);
    paragraphs.push(`Most consequential: ${first.title} — ${plainEvidence(first, i.pagesCrawled)}. ${imp}${second ? ` Also worth attention: ${second.title} — ${plainEvidence(second, i.pagesCrawled)}.` : ""}`);
    paragraphs.push(`Until these are fixed, the same obstacles meet every visitor to the affected pages. We have identified what to prioritize — book a website review and our team will turn these findings into a practical improvement plan for your practice.`);
  } else {
    paragraphs.push("Our recommendation: keep the site this way, and book a website review if you plan changes — we will check them against these results.");
  }

  const wordCount = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return { heading: `A message for ${i.businessName}`, paragraphs, wordCount };
}
