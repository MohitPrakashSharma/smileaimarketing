import { normalizeName, normalizeDomain } from "./normalization";
import { searchDataForSeoMaps, countryCodeToName } from "./dataforseo";

export interface DiscoveredBusinessItem {
  googlePlaceId?: string;
  name: string;
  website: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  phone?: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  providerSource: "TEST_PROVIDER" | "GOOGLE_PLACES" | "DATAFORSEO" | "MANUAL";
  rawProviderRef?: Record<string, unknown>;
}

/**
 * Controlled test provider returning up to 5 realistic dental practices for a target city.
 * Used ONLY when DATA_MODE !== 'live' and testMode is explicitly requested.
 */
export function getTestProviderBusinesses(
  city: string,
  category: string = "Dental Clinic",
  limit: number = 5
): DiscoveredBusinessItem[] {
  const normalizedCity = city.trim();
  const slug = normalizedCity.toLowerCase().replace(/[^a-z0-9]/g, "");

  const pool: DiscoveredBusinessItem[] = [
    {
      googlePlaceId: `ChIJ_test_place_01_${slug}`,
      name: `${normalizedCity} Dental Care`,
      website: `https://${slug}dentalcare.com`,
      address: `100 Main St, Suite 200, ${normalizedCity}`,
      city: normalizedCity,
      country: "US",
      phone: "(555) 234-5678",
      category,
      rating: 4.6,
      reviewCount: 84,
      providerSource: "TEST_PROVIDER",
      rawProviderRef: { provider: "TEST_PROVIDER", id: 1 },
    },
    {
      googlePlaceId: `ChIJ_test_place_02_${slug}`,
      name: `Apex Family Dentistry of ${normalizedCity}`,
      website: `https://apexfamilydentistry${slug}.com`,
      address: `450 Oak Ave, ${normalizedCity}`,
      city: normalizedCity,
      country: "US",
      phone: "(555) 345-6789",
      category,
      rating: 4.2,
      reviewCount: 38,
      providerSource: "TEST_PROVIDER",
      rawProviderRef: { provider: "TEST_PROVIDER", id: 2 },
    },
    {
      googlePlaceId: `ChIJ_test_place_03_${slug}`,
      name: `Downtown Dental Studio`,
      website: `https://downtowndental${slug}.com`,
      address: `12 4th Street, ${normalizedCity}`,
      city: normalizedCity,
      country: "US",
      phone: "(555) 456-7890",
      category,
      rating: 4.8,
      reviewCount: 142,
      providerSource: "TEST_PROVIDER",
      rawProviderRef: { provider: "TEST_PROVIDER", id: 3 },
    },
    {
      googlePlaceId: `ChIJ_test_place_04_${slug}`,
      name: `Bright Smile Orthodontics`,
      website: `https://brightsmile${slug}.com`,
      address: `880 Professional Parkway, ${normalizedCity}`,
      city: normalizedCity,
      country: "US",
      phone: "(555) 567-8901",
      category,
      rating: 4.4,
      reviewCount: 65,
      providerSource: "TEST_PROVIDER",
      rawProviderRef: { provider: "TEST_PROVIDER", id: 4 },
    },
    {
      googlePlaceId: `ChIJ_test_place_05_${slug}`,
      name: `${normalizedCity} Pediatric & General Dental`,
      website: `https://${slug}pediatricdental.com`,
      address: `312 Elm Square, ${normalizedCity}`,
      city: normalizedCity,
      country: "US",
      phone: "(555) 678-9012",
      category,
      rating: 4.9,
      reviewCount: 210,
      providerSource: "TEST_PROVIDER",
      rawProviderRef: { provider: "TEST_PROVIDER", id: 5 },
    },
  ];

  return pool.slice(0, Math.min(limit, pool.length));
}

/** Looks up a place's real website via Place Details — never guessed from its name. */
async function getGooglePlaceWebsite(placeId: string, apiKey: string): Promise<string | undefined> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
      placeId
    )}&fields=website&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    return typeof data.result?.website === "string" ? data.result.website : undefined;
  } catch (err) {
    console.error("[Discovery] Google Place Details lookup failed:", err);
    return undefined;
  }
}

/**
 * Main discovery service entry point. Strict DATA_MODE checks.
 */
export async function discoverBusinesses(params: {
  city: string;
  country?: string;
  state?: string;
  category?: string;
  limit?: number;
  dataProvider?: string;
}): Promise<DiscoveredBusinessItem[]> {
  const limit = Math.min(params.limit || 5, 5);
  const category = params.category || "Dental Clinic";
  const country = params.country || "US";
  const isLiveMode = process.env.DATA_MODE === "live";

  // An explicit "TEST_PROVIDER" request always gets safe synthetic data —
  // regardless of DATA_MODE — so a campaign's "test mode" toggle is a real
  // guarantee, not something a live-mode API key can silently override.
  if (params.dataProvider === "TEST_PROVIDER") {
    return getTestProviderBusinesses(params.city, category, limit);
  }

  // 1. DataForSEO Provider
  if (params.dataProvider === "DATAFORSEO" || (isLiveMode && process.env.DATAFORSEO_LOGIN && !params.dataProvider)) {
    try {
      const dfsResult = await searchDataForSeoMaps({
        keyword: category,
        city: params.city,
        country,
        state: params.state,
        limit,
      });

      const items: DiscoveredBusinessItem[] = dfsResult.items
        .slice(0, limit)
        .filter((item) => {
          // Never guess a domain from the business name — if DataForSEO
          // didn't index a real site for this listing, skip it rather than
          // fabricate a URL that may not even belong to them.
          const hasRealSite = Boolean(item.website || item.domain);
          if (!hasRealSite) {
            console.warn(`[Discovery] Skipping "${item.title}" — DataForSEO has no website on file for it.`);
          }
          return hasRealSite;
        })
        .map((item) => {
          const rawWebsite = item.website || `https://${item.domain}`;
          const domainClean = item.domain || rawWebsite.replace(/^https?:\/\//, "").split("/")[0];
          const siteUrl = rawWebsite.startsWith("http") ? rawWebsite : `https://${domainClean}`;
          return {
            googlePlaceId: item.place_id,
            name: item.title,
            website: siteUrl,
            address: item.address || params.city,
            city: params.city,
            country,
            phone: item.phone,
            category,
            rating: item.rating,
            reviewCount: item.reviews_count,
            providerSource: "DATAFORSEO",
            rawProviderRef: { taskId: dfsResult.task_id, cost: dfsResult.cost },
          };
        });

      if (items.length > 0) return items;
    } catch (err) {
      console.error("[Discovery] DataForSEO API error:", err);
      if (isLiveMode) {
        throw new Error(`DataForSEO live discovery failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // 2. Google Places API Provider
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (params.dataProvider === "GOOGLE_PLACES" || (isLiveMode && googleApiKey && !params.dataProvider)) {
    if (!googleApiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured in environment");
    }
    try {
      const locationQuery = [params.city, params.state, countryCodeToName(country)].filter(Boolean).join(", ");
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        `${category} in ${locationQuery}`
      )}&key=${googleApiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Google Places HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(`Google Places status error: ${data.status} - ${data.error_message || ""}`);
      }

      if (data.results && Array.isArray(data.results)) {
        // Text Search never includes `website` — it's a Place Details-only
        // field. Look each candidate up rather than guessing a domain from
        // the business name (a guess like "southbramptondentalcentre.com"
        // may not even resolve, and would misrepresent a real business).
        const candidates = data.results.slice(0, limit) as Record<string, unknown>[];
        const resolved = await Promise.all(
          candidates.map(async (item) => {
            const placeId = typeof item.place_id === "string" ? item.place_id : undefined;
            const name = typeof item.name === "string" ? item.name : "Dental Practice";
            const address = typeof item.formatted_address === "string" ? item.formatted_address : params.city;
            const website = placeId ? await getGooglePlaceWebsite(placeId, googleApiKey) : undefined;

            if (!website) {
              console.warn(`[Discovery] Skipping "${name}" — Google Places has no website on file for it.`);
              return null;
            }

            const result: DiscoveredBusinessItem = {
              googlePlaceId: placeId,
              name,
              website,
              address,
              city: params.city,
              country,
              category,
              rating: typeof item.rating === "number" ? item.rating : 4.5,
              reviewCount: typeof item.user_ratings_total === "number" ? item.user_ratings_total : 30,
              providerSource: "GOOGLE_PLACES",
              rawProviderRef: { placeId },
            };
            return result;
          })
        );

        const items = resolved.filter((r): r is DiscoveredBusinessItem => r !== null);
        if (items.length > 0) return items;
      }
    } catch (err) {
      console.error("[Discovery] Google Places API error:", err);
      if (isLiveMode) {
        throw new Error(`Google Places live discovery failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Strict check: In DATA_MODE=live, fixture/mock data fallback is FORBIDDEN
  if (isLiveMode) {
    throw new Error(`No live discovery provider succeeded for ${params.city}. DATA_MODE=live forbids fixture fallback.`);
  }

  // Fallback to test provider ONLY in test mode
  return getTestProviderBusinesses(params.city, category, limit);
}

export interface RealCompetitor {
  name: string;
  website?: string;
  rank: number;
  mapScore: number;
}

export interface LocalMarketLookup {
  competitors: RealCompetitor[];
  /** The audited business's own rank_group in the same local pack search, if it appeared at all. */
  ownRank?: number;
  /** True only when a live search actually ran and returned results — lets callers distinguish "we checked, you're unranked" from "we couldn't check." */
  checked: boolean;
}

/**
 * Looks up real nearby competitors — and the audited business's own local
 * search rank — via a single DataForSEO maps query, for use in an audit
 * report. Never fabricates placeholder names or a guessed rank: an empty
 * competitor list or missing ownRank means "no verified data," not "assume
 * something typical."
 */
export async function findLocalMarketPosition(params: {
  businessName: string;
  website: string;
  city: string;
  state?: string;
  country?: string;
  category?: string;
  limit?: number;
}): Promise<LocalMarketLookup> {
  const isLiveMode = process.env.DATA_MODE === "live";
  if (!isLiveMode || !process.env.DATAFORSEO_LOGIN) return { competitors: [], checked: false };

  const limit = params.limit || 3;
  const excludeDomain = normalizeDomain(params.website);
  const excludeName = normalizeName(params.businessName);

  try {
    const dfsResult = await searchDataForSeoMaps({
      keyword: params.category || "Dental Clinic",
      city: params.city,
      country: params.country,
      state: params.state,
      // Fetch extra results so filtering out the target business still leaves enough.
      limit: limit + 5,
    });

    const seenDomains = new Set<string>();
    const competitors: RealCompetitor[] = [];
    let ownRank: number | undefined;

    for (const item of dfsResult.items) {
      const itemDomain = normalizeDomain(item.domain || item.website || "");
      const itemName = normalizeName(item.title);
      const isTarget = (itemDomain && itemDomain === excludeDomain) || (!itemDomain && itemName === excludeName);

      if (isTarget) {
        if (typeof item.rank_group === "number") ownRank = item.rank_group;
        continue;
      }
      if (itemDomain && seenDomains.has(itemDomain)) continue;
      if (itemDomain) seenDomains.add(itemDomain);

      if (competitors.length < limit) {
        competitors.push({
          name: item.title,
          website: item.website || (item.domain ? `https://${item.domain}` : undefined),
          rank: item.rank_group || competitors.length + 1,
          mapScore: typeof item.rating === "number" ? item.rating : 4.5,
        });
      }
    }

    return { competitors, ownRank, checked: true };
  } catch (err) {
    console.error("[Local Market] DataForSEO lookup failed:", err);
    return { competitors: [], checked: false };
  }
}
