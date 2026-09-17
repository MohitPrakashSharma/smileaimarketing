import type { DiscoveredPlace } from "./types";

/**
 * Competitor selection — pure, so it is unit-tested without a provider.
 *
 * A candidate is kept only when it is an operating dental practice with a
 * website we can measure, is not the audited practice (by place id, domain
 * or normalised name), and matches the practice's specialty: a pediatric
 * practice is compared with other pediatric practices first, and only falls
 * back to general practices if fewer than two pediatric ones were found.
 */

export const DENTAL_TYPES = new Set(["dentist", "dental_clinic"]);
const PEDIATRIC_RE = /\b(pediatric|paediatric|kids?|children|child|junior|little|tots?|smiles? for kids|family & kids)\b/i;

export const normalizeDomain = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};
export const normalizeName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const isPediatric = (name: string, types: string[] = []) => PEDIATRIC_RE.test(name) || types.some((t) => /pediatric|paediatric/.test(t));

export interface SelectionInput {
  audited: { name: string; website: string; placeId?: string | null; category?: string | null };
  candidates: DiscoveredPlace[];
  limit?: number;
  /** Maximum straight-line distance to accept when a distance is known (km). */
  maxDistanceKm?: number;
}

export interface Selected extends DiscoveredPlace {
  domain: string;
  relevance: string;
}

export function selectCompetitors(i: SelectionInput): Selected[] {
  const limit = i.limit ?? 3;
  const maxKm = i.maxDistanceKm ?? 25;
  const ownDomain = normalizeDomain(i.audited.website);
  const ownName = normalizeName(i.audited.name);
  const pediatric = isPediatric(i.audited.name, []) || /pediatric|paediatric|kids|children/i.test(i.audited.category ?? "");

  const seen = new Set<string>();
  const eligible: Selected[] = [];
  for (const c of i.candidates) {
    const domain = normalizeDomain(c.website);
    if (!domain) continue; // nothing to measure
    if (c.businessStatus && c.businessStatus !== "OPERATIONAL") continue;
    if (!c.types.some((t) => DENTAL_TYPES.has(t))) continue;
    if (i.audited.placeId && c.placeId === i.audited.placeId) continue;
    if (domain === ownDomain || normalizeName(c.name) === ownName) continue;
    if (c.distanceKm !== null && c.distanceKm > maxKm) continue;
    if (seen.has(domain)) continue;
    seen.add(domain);
    const ped = isPediatric(c.name, c.types);
    const bits = [ped ? "pediatric dentist" : "dental practice", c.city ?? null, c.distanceKm !== null ? `${c.distanceKm < 1 ? "<1" : Math.round(c.distanceKm)} km away` : null].filter(Boolean);
    eligible.push({ ...c, domain, relevance: bits.join(" · ") });
  }

  // Specialty first, then distance (unknown distances last), then provider order.
  const ranked = eligible
    .map((c, idx) => ({ c, idx, ped: isPediatric(c.name, c.types) }))
    .sort((a, b) => {
      if (pediatric && a.ped !== b.ped) return a.ped ? -1 : 1;
      const da = a.c.distanceKm ?? Number.POSITIVE_INFINITY;
      const db = b.c.distanceKm ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.idx - b.idx;
    })
    .map((x) => x.c);

  // A pediatric practice compared only with general dentists would be misleading: require at least two pediatric matches, else give up on the fallback.
  if (pediatric) {
    const peds = ranked.filter((c) => isPediatric(c.name, c.types));
    if (peds.length >= 2) return peds.slice(0, limit);
    return [];
  }
  return ranked.slice(0, limit);
}
