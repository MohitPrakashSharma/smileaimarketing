import { NextResponse } from "next/server";
import { z } from "zod";
import { detectSiteProfile } from "@/lib/siteProfile.server";

const schema = z.object({
  website: z.string().trim().min(4).max(500),
});

/**
 * Looks a website up and returns what we can establish about the business
 * behind it — name, city, country, industry — so the audit form can fill
 * the location in the moment a URL is pasted. Nothing is guessed: fields
 * we couldn't verify come back null and the form keeps them editable.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A website URL is required" }, { status: 400 });
  }

  // Reject anything that isn't a plausible public hostname before we fetch it.
  const host = parsed.data.website.replace(/^https?:\/\//i, "").split("/")[0];
  if (!/^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?$/i.test(host) || /^(localhost|127\.|10\.|192\.168\.|169\.254\.)/i.test(host)) {
    return NextResponse.json({ error: "Please enter a valid public website address" }, { status: 400 });
  }

  try {
    const p = await detectSiteProfile(parsed.data.website);
    return NextResponse.json({
      website: p.website,
      reachable: p.reachable,
      name: p.name ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      country: p.country ?? null,
      industry: { key: p.industry.key, label: p.industry.label, searchKeyword: p.industry.searchKeyword },
      industryConfidence: p.industryConfidence,
      locationSource: p.locationSource ?? null,
      locationConfidence: p.locationConfidence ?? null,
      rating: p.rating ?? null,
      reviewCount: p.reviewCount ?? null,
    });
  } catch (error) {
    console.error("detect-site error:", error);
    return NextResponse.json({ error: "Couldn't analyze that website" }, { status: 500 });
  }
}
