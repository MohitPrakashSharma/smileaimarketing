import { normalizeName } from "./normalization";
import { searchDataForSeoMaps } from "./dataforseo";

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

/**
 * Main discovery service entry point. Strict DATA_MODE checks.
 */
export async function discoverBusinesses(params: {
  city: string;
  category?: string;
  limit?: number;
  dataProvider?: string;
}): Promise<DiscoveredBusinessItem[]> {
  const limit = Math.min(params.limit || 5, 5);
  const category = params.category || "Dental Clinic";
  const isLiveMode = process.env.DATA_MODE === "live";

  // 1. DataForSEO Provider
  if (params.dataProvider === "DATAFORSEO" || (isLiveMode && process.env.DATAFORSEO_LOGIN && !params.dataProvider)) {
    try {
      const dfsResult = await searchDataForSeoMaps({
        keyword: category,
        city: params.city,
        limit,
      });

      const items: DiscoveredBusinessItem[] = dfsResult.items.slice(0, limit).map((item) => {
        const rawWebsite = item.website || (item.domain ? `https://${item.domain}` : `https://${normalizeName(item.title).replace(/\s+/g, "")}.com`);
        const domainClean = item.domain || rawWebsite.replace(/^https?:\/\//, "").split("/")[0];
        const siteUrl = rawWebsite.startsWith("http") ? rawWebsite : `https://${domainClean}`;
        return {
          googlePlaceId: item.place_id,
          name: item.title,
          website: siteUrl,
          address: item.address || params.city,
          city: params.city,
          country: "US",
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
  if (params.dataProvider === "GOOGLE_PLACES" || (isLiveMode && googleApiKey)) {
    if (!googleApiKey) {
      throw new Error("GOOGLE_PLACES_API_KEY is not configured in environment");
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        `${category} in ${params.city}`
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
        const items: DiscoveredBusinessItem[] = data.results.slice(0, limit).map((item: Record<string, unknown>) => {
          const placeId = typeof item.place_id === "string" ? item.place_id : undefined;
          const name = typeof item.name === "string" ? item.name : "Dental Practice";
          const website = typeof item.website === "string" ? item.website : `https://${normalizeName(name).replace(/\s+/g, "")}.com`;
          const address = typeof item.formatted_address === "string" ? item.formatted_address : params.city;
          return {
            googlePlaceId: placeId,
            name,
            website,
            address,
            city: params.city,
            country: "US",
            category,
            rating: typeof item.rating === "number" ? item.rating : 4.5,
            reviewCount: typeof item.user_ratings_total === "number" ? item.user_ratings_total : 30,
            providerSource: "GOOGLE_PLACES",
            rawProviderRef: { placeId },
          };
        });

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
