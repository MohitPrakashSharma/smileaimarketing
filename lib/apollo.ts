export interface ApolloContactResult {
  found: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  providerId?: string;
  confidenceScore?: number;
  error?: string;
}

export async function enrichBusinessContact(domain: string): Promise<ApolloContactResult> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    if (process.env.DATA_MODE === "live") {
      throw new Error("APOLLO_API_KEY is missing. DATA_MODE=live requires real Apollo credentials.");
    }
    return { found: false, error: "APOLLO_API_KEY is not configured" };
  }

  const cleanDomain = domain.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();

  try {
    // 1. Apollo Mixed People Search
    const searchUrl = "https://api.apollo.io/v1/mixed_people/search";
    const res = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        api_key: apiKey,
        q_organization_domains: [cleanDomain],
        person_titles: [
          "Practice Owner",
          "Clinic Owner",
          "Principal Dentist",
          "Owner",
          "Dentist",
          "Practice Manager",
          "Office Manager",
        ],
        page: 1,
        per_page: 5,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { found: false, error: `Apollo API HTTP ${res.status}: ${errText.slice(0, 150)}` };
    }

    const data = await res.json();
    const people = data.people || [];

    if (people.length === 0) {
      return { found: false, error: "No verified decision-maker found for domain." };
    }

    // Pick top decision maker
    const person = people[0];
    const email = person.email || person.sanitized_phone || undefined;

    return {
      found: true,
      firstName: person.first_name || "Doctor",
      lastName: person.last_name || "Practice Lead",
      email: person.email,
      phone: person.phone_numbers?.[0]?.raw_number || person.sanitized_phone,
      role: person.title || "Principal Dentist",
      providerId: person.id,
      confidenceScore: person.email_status === "verified" ? 95 : 75,
    };
  } catch (err) {
    console.error("[Apollo Enrichment] Error:", err);
    if (process.env.DATA_MODE === "live") {
      throw new Error(`Apollo live enrichment failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return { found: false, error: err instanceof Error ? err.message : "Apollo API error" };
  }
}
