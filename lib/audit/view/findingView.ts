import { fmtMs } from "./performanceView";

/**
 * Plain-language "what we measured" for a finding's default view. Built only
 * from the stored developer details (the measured values), never from
 * anything the report would have to guess. Technical wording stays in the
 * expandable details; this is the sentence a clinic owner reads first.
 */

export interface FindingDetailLike {
  checkId: string;
  title: string;
  detected: string | null;
  affectedPageCount: number;
  device?: string | null;
  urls: Array<{ url: string; detected?: string }>;
}

export interface FindingLike {
  title: string;
  affectedPageCount: number;
  detectedValue: string | null;
  developerDetails: FindingDetailLike[] | null;
  recommendedFix: string;
  whyItMatters: string;
  device: string | null;
}

const num = (s: string | null | undefined): number | null => {
  if (!s) return null;
  const m = s.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const dev = (d: string | null | undefined) => (d === "desktop" ? "on desktop" : d === "mobile" ? "on mobile" : "");
const pages = (n: number) => `${n} page${n === 1 ? "" : "s"}`;

const isHomepage = (url: string) => {
  try {
    return new URL(url).pathname === "/";
  } catch {
    return false;
  }
};

/** One measured sentence for a single check; null when there is nothing meaningful to say. */
export function humanizeDetail(d: FindingDetailLike): string | null {
  const id = d.checkId;
  // Prefer the homepage's value when it is among the affected URLs — the page the reader knows best.
  const leadUrl = d.urls.find((u) => isHomepage(u.url)) ?? d.urls[0];
  const lead = leadUrl?.detected ?? d.detected;
  const n = d.affectedPageCount;
  const onPages = n > 1 ? ` on ${n} pages` : "";
  const v = num(lead);
  const where = dev(d.device);
  // A PageSpeed measurement is per page: with several affected pages the sentence
  // gives the measured range, never one page's number for all of them. Field data
  // (Chrome UX Report) at origin level is one site-wide figure — said so explicitly.
  const vals = d.urls.map((u) => num(u.detected)).filter((x): x is number => x !== null);
  const lo = vals.length ? Math.min(...vals) : v;
  const hi = vals.length ? Math.max(...vals) : v;
  const spread = n > 1 && lo !== null && hi !== null && lo !== hi;
  const range = (f: (x: number) => string) => (spread ? `${f(lo!)}–${f(hi!)}` : f(v!));
  const across = n > 1 ? ` across ${n} pages` : "";
  const isField = /\.field\./.test(id);
  const originLevel = isField && /origin-level/.test(lead ?? "");
  const src = isField ? (originLevel ? " (real visitors, site-wide Chrome UX Report figure — not page-specific)" : " (real visitors of this page, Chrome UX Report)") : " (Google's simulated Lighthouse test)";
  if (/^perf\.(mobile|desktop)\.(field|lab)\.lcp/.test(id) && v !== null) return `Main content takes ${originLevel ? fmtMs(v) : range(fmtMs)} to appear ${where}${originLevel ? "" : across}${src} — Google's target is 2.5 s`;
  if (/^perf\.mobile\.field\.inp/.test(id) && v !== null) return `The page takes ${originLevel ? fmtMs(v) : range(fmtMs)} to respond to a tap ${where}${src} — target 200 ms`;
  if (/^perf\.mobile\.(field|lab)\.cls/.test(id) && v !== null) return `The layout shifts by ${originLevel ? v.toFixed(2) : range((x) => x.toFixed(2))} while loading ${where}${src} — target 0.1`;
  if (/^perf\.mobile\.lab\.tbt/.test(id) && v !== null) return `Scripts freeze the page for ${range(fmtMs)} during load ${where}${across}${src} — target 200 ms`;
  if (/^perf\.mobile\.lab\.fcp/.test(id) && v !== null) return `Nothing appears on screen for ${range(fmtMs)} ${where}${across}${src} — target 1.8 s`;
  if (/^perf\.mobile\.lab\.speed_index/.test(id) && v !== null) return `The visible page takes ${range(fmtMs)} to fill in ${where}${across}${src} — target 3.4 s`;
  if (/^perf\.(mobile|desktop)\.lab\.score/.test(id) && v !== null) return `Google PageSpeed score${spread ? "s" : ""} ${range((x) => String(Math.round(x)))}/100 ${where}${across}`;
  if (/^perf\.diag\./.test(id) && lead && !/^\d+ page\(s\)$/.test(lead)) return `${lead.charAt(0).toUpperCase()}${lead.slice(1)}${where ? ` ${where}` : ""}${n > 1 ? ` (${n} pages)` : ""}`;
  if (lead && !/^\d+ page\(s\)$/.test(lead)) return `${lead}${onPages}`;
  return null;
}

/**
 * The default-view "measured result" for a finding: the lead check's plain
 * sentence, with a note when other checks contributed. Falls back to page
 * reach when the evidence is only "affects N pages".
 */
export function measuredSummary(f: FindingLike, totalPages: number | null): string {
  const details = f.developerDetails ?? [];
  const lead = details.map(humanizeDetail).find((s): s is string => Boolean(s));
  const more = details.length - 1;
  if (lead) return more > 0 ? `${lead} · +${more} related check${more === 1 ? "" : "s"}` : lead;
  if (f.detectedValue && !/^\d+ page\(s\)$/.test(f.detectedValue)) return f.detectedValue.split(";")[0].trim();
  return totalPages ? `Affects ${pages(f.affectedPageCount)} of the ${totalPages} we crawled` : `Affects ${pages(f.affectedPageCount)}`;
}

/** First actionable line of the recommended fix (the intro), without the bullet list. */
export function primaryAction(f: FindingLike): string {
  return f.recommendedFix.split("\n").map((l) => l.replace(/^•\s*/, "").trim()).find(Boolean) ?? "";
}

/** First sentence of "why it matters" — the concise default; the full text lives in the expanded view. */
export function whyInBrief(f: FindingLike): string {
  const m = f.whyItMatters.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : f.whyItMatters).trim();
}
