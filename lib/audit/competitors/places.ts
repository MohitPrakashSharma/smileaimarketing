import type { DiscoveredPlace } from "./types";

/**
 * Google Places API (New) Text Search — the discovery provider for the local
 * comparison. Two calls per audit: one to locate the audited practice (its
 * place id and coordinates), one biased to that location for nearby dental
 * practices. Field mask kept to what selection needs; `websiteUri` and
 * `businessStatus` decide the SKU (see docs/local-comparison.md for cost).
 *
 * Places content policy: place ids may be stored indefinitely; other fields
 * are refreshed by re-running discovery and the report shows the retrieval
 * date and a Google attribution. Nothing here is called unless
 * AUDIT_COMPETITORS_ENABLED is on and a Places key is configured.
 */

export type PlacesFetch = (url: string, init: RequestInit) => Promise<Response>;

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = ["places.id", "places.displayName", "places.websiteUri", "places.formattedAddress", "places.addressComponents", "places.location", "places.types", "places.businessStatus"].join(",");

interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  websiteUri?: string;
  formattedAddress?: string;
  addressComponents?: Array<{ longText?: string; types?: string[] }>;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  businessStatus?: string;
}

export interface PlaceHit extends DiscoveredPlace {
  latitude: number | null;
  longitude: number | null;
}

export const haversineKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number => {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

export function parsePlaces(body: unknown, origin: { latitude: number; longitude: number } | null): PlaceHit[] {
  const places = ((body as { places?: RawPlace[] })?.places ?? []).filter((p) => p && typeof p === "object");
  return places.map((p) => {
    const comps = p.addressComponents ?? [];
    const city = comps.find((c) => c.types?.includes("locality"))?.longText ?? comps.find((c) => c.types?.includes("postal_town"))?.longText ?? null;
    const lat = typeof p.location?.latitude === "number" ? p.location.latitude : null;
    const lng = typeof p.location?.longitude === "number" ? p.location.longitude : null;
    return {
      placeId: String(p.id ?? ""),
      name: String(p.displayName?.text ?? ""),
      website: typeof p.websiteUri === "string" ? p.websiteUri : null,
      address: typeof p.formattedAddress === "string" ? p.formattedAddress : null,
      city,
      types: Array.isArray(p.types) ? p.types : [],
      businessStatus: typeof p.businessStatus === "string" ? p.businessStatus : null,
      latitude: lat,
      longitude: lng,
      distanceKm: origin && lat !== null && lng !== null ? Math.round(haversineKm(origin, { latitude: lat, longitude: lng }) * 10) / 10 : null,
    };
  });
}

export async function searchPlaces(opts: { apiKey: string; textQuery: string; maxResultCount?: number; bias?: { latitude: number; longitude: number; radiusM: number } | null; includedType?: string; fetchImpl?: PlacesFetch; timeoutMs?: number }): Promise<PlaceHit[]> {
  const fetchImpl = opts.fetchImpl ?? ((u, init) => fetch(u, init));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12_000);
  try {
    const body: Record<string, unknown> = { textQuery: opts.textQuery, maxResultCount: Math.min(20, opts.maxResultCount ?? 10), languageCode: "en" };
    if (opts.includedType) body.includedType = opts.includedType;
    if (opts.bias) body.locationBias = { circle: { center: { latitude: opts.bias.latitude, longitude: opts.bias.longitude }, radius: opts.bias.radiusM } };
    const res = await fetchImpl(ENDPOINT, { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json", "X-Goog-Api-Key": opts.apiKey, "X-Goog-FieldMask": FIELD_MASK }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Google Places (new) HTTP ${res.status}: ${(await res.text()).replace(opts.apiKey, "[redacted]").slice(0, 200)}`);
    return parsePlaces(await res.json(), opts.bias ? { latitude: opts.bias.latitude, longitude: opts.bias.longitude } : null);
  } finally {
    clearTimeout(timer);
  }
}

/** Locates the audited practice by its domain (Google matches listings by website well), returning the first hit whose website domain matches. */
export async function locatePractice(opts: { apiKey: string; website: string; name: string; city: string; fetchImpl?: PlacesFetch }): Promise<PlaceHit | null> {
  const domain = (() => {
    try {
      return new URL(opts.website).hostname.replace(/^www\./, "");
    } catch {
      return opts.website;
    }
  })();
  const hits = await searchPlaces({ apiKey: opts.apiKey, textQuery: `${domain}`, maxResultCount: 5, fetchImpl: opts.fetchImpl });
  const byDomain = hits.find((h) => h.website && new URL(h.website).hostname.replace(/^www\./, "").toLowerCase() === domain.toLowerCase());
  if (byDomain) return byDomain;
  const byName = await searchPlaces({ apiKey: opts.apiKey, textQuery: `${opts.name} ${opts.city}`, maxResultCount: 3, fetchImpl: opts.fetchImpl });
  return byName.find((h) => h.website && new URL(h.website).hostname.replace(/^www\./, "").toLowerCase() === domain.toLowerCase()) ?? null;
}
