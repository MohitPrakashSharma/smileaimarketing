import type { CrawlResult, CrawledPage } from "../core/types";
import type { IndustryProfile } from "@/lib/industry";

/**
 * A check is a pure function from crawl evidence to an outcome. It never
 * fetches, never calls AI, and never decides scores — it reports what it
 * observed (affected pages with detected/expected values) and the registry
 * metadata (severity, weight, impact, effort) turns that into ledger rows,
 * grouped findings and scores downstream.
 */

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OPPORTUNITY";
export type Pillar = "TECHNICAL" | "CONTENT" | "SEARCH" | "LOCAL" | "CONVERSION";
export type CheckStatus = "PASS" | "FAIL" | "SKIPPED" | "INFO";

export interface CheckContext {
  crawl: CrawlResult;
  siteHost: string;
  business: {
    name: string;
    city?: string;
    industry: IndustryProfile;
    /** true when the business has a physical location (city known) — enables location-related checks */
    hasLocation: boolean;
  };
  /** 200 + HTML + not redirected to a different URL (the page the visitor actually lands on) */
  htmlPages: CrawledPage[];
  indexablePages: CrawledPage[];
  homepage: CrawledPage | null;
  /** homepage + depth ≤ 1 indexable pages — "important" pages for escalation */
  keyPages: CrawledPage[];
}

export interface AffectedPage {
  url: string;
  detected?: string;
  expected?: string;
  evidence?: Record<string, unknown>;
}

export interface CheckOutcome {
  status: CheckStatus;
  affected: AffectedPage[];
  /** For SKIPPED / INFO: why. */
  reason?: string;
  /** Site-level summary values when the check isn't per-page. */
  detected?: string;
  expected?: string;
  evidence?: Record<string, unknown>;
  /** A check may lower/raise its own severity based on what it saw (e.g. one 404 vs. thirty). */
  severityOverride?: Severity;
}

export interface CheckDefinition {
  id: string; // "tech.https.missing"
  pillar: Pillar;
  section: string; // report section code, e.g. "B5"
  title: string; // developer-facing, e.g. "Pages served over HTTP"
  severity: Severity;
  /** Max points this check can remove from its pillar. */
  weight: number;
  impact: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  /** 0–100. How reliably our evidence proves the problem. */
  confidence: number;
  /** Site-level checks: a single failure counts as affecting the whole site (pageShare = 1). */
  siteWide?: boolean;
  /** Templates may use {customers} {customer} {business} {businesses} {booking} {searchKeyword} {city}. */
  expected: string;
  why: string;
  fix: string;
  developerFix?: string;
  run: (ctx: CheckContext) => CheckOutcome;
}

export interface CheckRun {
  def: CheckDefinition;
  outcome: CheckOutcome;
  affectedPageCount: number;
  /** affected ÷ denominator (indexable pages, or 1 for site-wide) — drives penalty and escalation */
  pageShare: number;
  /** Severity after escalation rules (lib/audit/priority.ts#escalateSeverity). */
  severity: Severity | null;
  affectsHomepage: boolean;
  affectsKeyPage: boolean;
}

export const pass = (): CheckOutcome => ({ status: "PASS", affected: [] });
export const skipped = (reason: string): CheckOutcome => ({ status: "SKIPPED", affected: [], reason });
export const info = (reason: string, evidence?: Record<string, unknown>): CheckOutcome => ({ status: "INFO", affected: [], reason, evidence });
export const fail = (affected: AffectedPage[], extra: Partial<Omit<CheckOutcome, "status" | "affected">> = {}): CheckOutcome =>
  affected.length === 0 && !extra.detected ? pass() : { status: "FAIL", affected, ...extra };
