import { normalizeName } from "./normalization";

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
 * Controlled test provider returning up to 5-10 realistic dental practices for a target city.
 * Clearly labeled as TEST_PROVIDER data.
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
 * Main discovery service entry point. Fallback to TEST_PROVIDER if live API key is absent or testMode is active.
 */
export async function discoverBusinesses(params: {
  city: string;
  category?: string;
  limit?: number;
  dataProvider?: string;
}): Promise<DiscoveredBusinessItem[]> {
  const limit = Math.min(params.limit || 5, 10);
  const category = params.category || "Dental Clinic";

  // Check if live Google Places API key exists
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (params.dataProvider === "GOOGLE_PLACES" && googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        `${category} in ${params.city}`
      )}&key=${googleApiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          const items: DiscoveredBusinessItem[] = data.results.slice(0, limit).map((item: unknown) => {
            const p = item as Record<string, unknown>;
            const placeId = typeof p.place_id === "string" ? p.place_id : undefined;
            const name = typeof p.name === "string" ? p.name : "Dental Practice";
            const website = typeof p.website === "string" ? p.website : `https://${normalizeName(name).replace(/\s+/g, "")}.com`;
            const address = typeof p.formatted_address === "string" ? p.formatted_address : params.city;
            return {
              googlePlaceId: placeId,
              name,
              website,
              address,
              city: params.city,
              country: "US",
              category,
              rating: typeof p.rating === "number" ? p.rating : 4.5,
              reviewCount: typeof p.user_ratings_total === "number" ? p.user_ratings_total : 30,
              providerSource: "GOOGLE_PLACES",
              rawProviderRef: { placeId },
            };
          });
          if (items.length > 0) return items;
        }
      }
    } catch (err) {
      console.warn("[Discovery] Google Places API call failed, falling back to TEST_PROVIDER", err);
    }
  }

  // Fallback to test provider
  return getTestProviderBusinesses(params.city, category, limit);
}
