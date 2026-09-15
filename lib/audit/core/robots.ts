import type { RobotsInfo } from "./types";

/**
 * Minimal robots.txt implementation following the REP RFC 9309 rules we
 * need: user-agent groups, Allow/Disallow with longest-match precedence,
 * `*` wildcards and `$` end anchors, and Sitemap directives. We are not a
 * browser; we honour it for crawling and *report* on it as an SEO signal.
 */

export interface RobotsRules {
  allow: string[];
  disallow: string[];
  sitemaps: string[];
  /** true when no group applied to us (or file missing) → everything allowed */
  unrestricted: boolean;
}

function patternToRegex(pattern: string): RegExp {
  let re = "^";
  for (const ch of pattern) {
    if (ch === "*") re += ".*";
    else if (ch === "$") re += "$";
    else re += ch.replace(/[.+?^${}()|[\]\\/]/g, "\\$&");
  }
  return new RegExp(re);
}

export function parseRobots(body: string, ourAgentToken = "smileaiauditbot"): RobotsRules {
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }> = [];
  const sitemaps: string[] = [];
  let current: { agents: string[]; allow: string[]; disallow: string[] } | null = null;
  let lastWasAgent = false;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }
    if (!current) continue;
    if (field === "disallow") current.disallow.push(value);
    else if (field === "allow") current.allow.push(value);
  }

  // Most specific group wins: our token, else "*".
  const ours = groups.find((g) => g.agents.some((a) => a !== "*" && ourAgentToken.includes(a)));
  const star = groups.find((g) => g.agents.includes("*"));
  const group = ours ?? star;
  if (!group) return { allow: [], disallow: [], sitemaps, unrestricted: true };
  return { allow: group.allow, disallow: group.disallow.filter((d) => d !== ""), sitemaps, unrestricted: false };
}

export function isAllowed(rules: RobotsRules, url: string): boolean {
  if (rules.unrestricted) return true;
  let path: string;
  try {
    const u = new URL(url);
    path = u.pathname + u.search;
  } catch {
    return true;
  }
  // Longest matching rule wins; ties → allow.
  let best: { len: number; allow: boolean } | null = null;
  for (const rule of rules.disallow) {
    if (patternToRegex(rule).test(path) && (!best || rule.length > best.len)) best = { len: rule.length, allow: false };
  }
  for (const rule of rules.allow) {
    if (patternToRegex(rule).test(path) && (!best || rule.length >= best.len)) best = { len: rule.length, allow: true };
  }
  return best ? best.allow : true;
}

export function blocksEverything(rules: RobotsRules): boolean {
  if (rules.unrestricted) return false;
  return rules.disallow.some((d) => d === "/" || d === "/*") && !rules.allow.some((a) => a === "/" || a === "/*");
}

export function toRobotsInfo(status: number | null, body: string | null, rules: RobotsRules | null): RobotsInfo {
  return {
    fetched: status !== null,
    status,
    body: body ? body.slice(0, 4000) : null,
    sitemaps: rules?.sitemaps ?? [],
    blocksAll: rules ? blocksEverything(rules) : false,
    disallow: rules?.disallow ?? [],
    allow: rules?.allow ?? [],
  };
}
