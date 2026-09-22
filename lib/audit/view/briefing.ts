import { measuredSummary, primaryAction, whyInBrief, type FindingLike } from "./findingView";
import { PILLAR_LABEL, BUCKET_LABEL, OWNER_LABEL } from "./pillars";

/**
 * The business briefing both customer surfaces render: the web report and the
 * free customer PDF call this one function with the same stored audit, so the
 * headline, summary, problems, actions and counts can never disagree.
 *
 * Everything here is derived deterministically from verified findings — the
 * title the check produced, the measurement it stored, our own "why it
 * matters" sentence and its recommended fix. Nothing is invented, no figure is
 * derived from the score, and no sentence converts a measurement into patients,
 * rankings or revenue; the money question is answered only by the separate
 * opportunity scenario (lib/audit/opportunity), which never reads this module.
 */

export type BriefingFinding = FindingLike & {
  id: string;
  pillar: string;
  severity: string;
  bucket: string;
  owner: string;
  effort: number;
};

export interface BriefingInput {
  business: { name: string; website: string; city: string };
  scores: { overall: number | null; performance: number | null } | null;
  severityCounts: Record<string, number>;
  /** Already ordered by priority (the report payload sorts them). */
  findings: BriefingFinding[];
  pagesCrawled: number;
  checksRun: number;
}

export interface BriefingProblem {
  id: string;
  /** Plain-English problem headline (the verified finding's title). */
  headline: string;
  /** One sentence: what was measured. */
  evidence: string;
  /** One sentence: what it can mean for visitors — possibility, never a measured outcome. */
  implication: string;
  /** One concise recommended action. */
  action: string;
  severity: string;
  severityLabel: string;
  area: string;
  /** "you can do this" / "needs a developer". */
  ownerLabel: string;
}

export interface BriefingAction {
  title: string;
  detail: string;
  severity: string;
  severityLabel: string;
  /** "Do this week" / "Do this month" / "Plan this quarter". */
  whenLabel: string;
  ownerLabel: string;
}

export interface ReportBriefing {
  practice: { name: string; city: string; website: string; domain: string };
  /** The single most consequential verified problem, as the section headline. */
  headline: string;
  /** At most 60 words, every clause traceable to a stored number. */
  summary: string;
  stats: {
    score: number | null;
    findings: number;
    criticalHigh: number;
    critical: number;
    high: number;
    pagesCrawled: number;
    checksRun: number;
    /** Title of the most consequential verified problem; null when there are no findings. */
    topProblem: string | null;
  };
  problems: BriefingProblem[];
  /** Everything not in `problems`, as a compact tally — never a second list of long cards. */
  more: { total: number; byArea: Array<{ label: string; count: number }>; titles: string[] };
  actions: BriefingAction[];
  /** False when Google PageSpeed could not test the site — disclosed, never held against the score. */
  performanceMeasured: boolean;
}

export const SEVERITY_LABEL: Record<string, string> = { CRITICAL: "Critical", HIGH: "High priority", MEDIUM: "Medium", LOW: "Low", OPPORTUNITY: "Suggestion" };

const domainOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
};
const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const stripTrailingDot = (s: string) => s.replace(/\s*[.;,]\s*$/, "");
const sentence = (s: string) => (s ? `${stripTrailingDot(s.trim())}.` : s);
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
/** An action title is the instruction itself, cut at the first colon when the fix spells out its own sub-list. */
const firstClause = (s: string) => {
  const cut = s.split(/:\s/)[0];
  return cut.length >= 20 ? cut : s;
};

/** Joins sentences in order, stopping before the word budget is exceeded. */
function budget(sentences: string[], maxWords: number): string {
  const out: string[] = [];
  let used = 0;
  for (const s of sentences) {
    const w = words(s);
    if (used + w > maxWords) break;
    out.push(s);
    used += w;
  }
  return out.join(" ");
}

function problemFrom(f: BriefingFinding, pagesCrawled: number): BriefingProblem {
  return {
    id: f.id,
    headline: stripTrailingDot(f.title),
    evidence: sentence(measuredSummary(f, pagesCrawled || null)),
    implication: sentence(whyInBrief(f)),
    action: sentence(primaryAction(f)),
    severity: f.severity,
    severityLabel: SEVERITY_LABEL[f.severity] ?? f.severity,
    area: PILLAR_LABEL[f.pillar] ?? f.pillar,
    ownerLabel: OWNER_LABEL[f.owner] ?? f.owner,
  };
}

/**
 * The three things to do next. The list follows the audit's own priority
 * order, except that one quick win the owner can do themselves is pulled in
 * for the last slot when the top of the list is all developer work — so the
 * reader always has something they can start today.
 */
function pickActions(findings: BriefingFinding[]): BriefingFinding[] {
  const top = findings.slice(0, 3);
  if (top.length < 3) return top;
  const allBig = top.every((f) => f.owner !== "owner" || f.effort > 2);
  if (!allBig) return top;
  const quickWin = findings.slice(3, 12).find((f) => f.owner === "owner" && f.effort <= 2);
  return quickWin ? [...top.slice(0, 2), quickWin] : top;
}

export function buildBriefing(input: BriefingInput): ReportBriefing {
  const { business, findings, severityCounts, pagesCrawled, checksRun } = input;
  const domain = domainOf(business.website);
  const critical = severityCounts.CRITICAL ?? 0;
  const high = severityCounts.HIGH ?? 0;
  const criticalHigh = critical + high;
  const top = findings[0] ?? null;
  const problems = findings.slice(0, 3).map((f) => problemFrom(f, pagesCrawled));

  // Remaining findings as a tally, not a second list of cards.
  const rest = findings.slice(problems.length);
  const byArea = Object.entries(
    rest.reduce<Record<string, number>>((acc, f) => {
      const label = PILLAR_LABEL[f.pillar] ?? f.pillar;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const actions = pickActions(findings).map((f) => ({
    title: firstClause(stripTrailingDot(primaryAction(f))) || stripTrailingDot(f.title),
    detail: stripTrailingDot(f.title),
    severity: f.severity,
    severityLabel: SEVERITY_LABEL[f.severity] ?? f.severity,
    whenLabel: BUCKET_LABEL[f.bucket] ?? "",
    ownerLabel: OWNER_LABEL[f.owner] ?? f.owner,
  }));

  const headline = top ? stripTrailingDot(top.title) : `No blocking problems found on ${domain}`;

  // ≤60 words, in the order a practice owner needs them: scope, what was found, the one that matters most.
  const summary = top
    ? budget(
        [
          `We crawled ${pagesCrawled} page${pagesCrawled === 1 ? "" : "s"} of ${domain} and ran ${checksRun} checks.`,
          criticalHigh > 0
            ? `${findings.length} verified finding${findings.length === 1 ? "" : "s"}, ${critical} critical and ${high} high priority.`
            : `${findings.length} verified finding${findings.length === 1 ? "" : "s"}, none critical or high priority.`,
          `The one to fix first: ${lowerFirst(stripTrailingDot(top.title))} — ${lowerFirst(stripTrailingDot(measuredSummary(top, pagesCrawled || null)))}.`,
          "The rest of this briefing covers what that could be worth, how nearby practices measured, and what to do next.",
        ],
        60,
      )
    : budget(
        [
          `We crawled ${pagesCrawled} page${pagesCrawled === 1 ? "" : "s"} of ${domain} and ran ${checksRun} checks.`,
          "Nothing crossed our thresholds, so there is no priority list this time.",
          "The sections below cover how nearby practices measured and where the opportunity sits.",
        ],
        60,
      );

  return {
    practice: { name: business.name, city: business.city, website: business.website, domain },
    headline,
    summary,
    stats: { score: input.scores?.overall ?? null, findings: findings.length, criticalHigh, critical, high, pagesCrawled, checksRun, topProblem: top ? stripTrailingDot(top.title) : null },
    problems,
    more: { total: rest.length, byArea, titles: rest.slice(0, 6).map((f) => stripTrailingDot(f.title)) },
    actions,
    performanceMeasured: (input.scores?.performance ?? null) !== null,
  };
}
