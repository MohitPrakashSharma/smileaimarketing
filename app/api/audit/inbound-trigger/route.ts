import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizeDomain, normalizeName } from "@/lib/normalize";
import { checkWebsite } from "@/lib/websiteCheck.server";
import { dispatchAudit, selectedEngine } from "@/lib/audit/engine";
import { trackEvent, readVisitorCookies } from "@/lib/analytics";
import { detectSiteProfile } from "@/lib/siteProfile.server";
import { industryFromCategory, INDUSTRIES } from "@/lib/industry";

const inboundSchema = z.object({
  website: z.string().url(),
  // City is detected from the website when the form didn't supply one.
  city: z.string().trim().min(2).optional(),
  businessName: z.string().trim().min(2).max(120).optional(),
  // Legacy field name from the old form — kept so nothing external breaks.
  clinicName: z.string().trim().min(2).max(120).optional(),
  country: z.string().trim().length(2).optional(),
  industry: z.string().trim().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = inboundSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: "Invalid inputs" }, { status: 400 });
    }

    const input = result.data;
    const normalizedDomain = normalizeDomain(input.website);

    // Who is this, and where? The form usually sends what it already
    // detected; we look the site up again here regardless (cached, so it's
    // free) so the record is right even if the client lookup failed.
    const profile = await detectSiteProfile(input.website);
    const website = profile.website;

    const rawCity = input.city || profile.city;
    if (!rawCity) {
      return NextResponse.json(
        { error: "We couldn't detect a city for this website — please enter it.", code: "CITY_REQUIRED" },
        { status: 422 }
      );
    }
    // "Toronto, ON" from the auto-fill → city "Toronto", state "ON"
    const [cityPart, statePart] = rawCity.split(",").map((s) => s.trim());
    const city = cityPart;
    const state = statePart || profile.state || undefined;
    const country = normalizeCountryCode(input.country) || profile.country || "US";

    const industry =
      INDUSTRIES.find((i) => i.key === input.industry) ??
      (profile.industry.key !== "local-business" ? profile.industry : industryFromCategory(input.industry));
    const businessName = input.businessName || input.clinicName || profile.name || `${industry.label} at ${normalizedDomain}`;
    const normalizedName = normalizeName(businessName);

    // Check if the business already exists — exact match first, then by
    // normalized domain (catches e.g. https://x.com vs https://www.x.com/).
    let business = await prisma.business.findUnique({
      where: {
        website_city: { website, city },
      },
    });

    if (!business) {
      business = await prisma.business.findFirst({
        where: { normalizedDomain, city },
      });
    }

    const isNewBusiness = !business;

    if (!business) {
      // First-touch attribution is captured once, here, at the moment this
      // anonymous visitor becomes a named lead — never overwritten afterwards.
      const { visitorId, firstTouch } = readVisitorCookies(request);
      // A Google listing may already be on file from a campaign discovery run.
      const placeOwner = profile.googlePlaceId
        ? await prisma.business.findUnique({ where: { googlePlaceId: profile.googlePlaceId } })
        : null;
      business = await prisma.business.create({
        data: {
          name: businessName,
          normalizedName,
          website,
          normalizedDomain,
          address: profile.address,
          city,
          state,
          country,
          phone: profile.phone,
          category: industry.label,
          rating: profile.rating,
          reviewCount: profile.reviewCount,
          googlePlaceId: placeOwner ? null : profile.googlePlaceId,
          status: "AUDITING",
          providerSource: profile.googlePlaceId ? "GOOGLE_PLACES" : "SELF_SERVE",
          lastCheckedAt: new Date(),
          visitorId,
          firstTouchSource: firstTouch?.source,
          firstTouchMedium: firstTouch?.medium,
          firstTouchCampaign: firstTouch?.campaign,
          firstTouchContent: firstTouch?.content,
          firstTouchTerm: firstTouch?.term,
          firstTouchLandingPage: firstTouch?.landingPage,
          firstTouchReferrer: firstTouch?.referrer,
        },
      });
    } else {
      // Returning business: refresh anything the lookup verified, keep the
      // rest. The placeholder name from the old form gets replaced too.
      const hadPlaceholderName = /^my dental practice$/i.test(business.name) || business.name.startsWith("Local Business at ");
      business = await prisma.business.update({
        where: { id: business.id },
        data: {
          status: "AUDITING",
          lastCheckedAt: new Date(),
          name: hadPlaceholderName && businessName ? businessName : undefined,
          normalizedName: hadPlaceholderName && businessName ? normalizedName : undefined,
          category: business.category === "Dental Clinic" && industry.key !== "dental" ? industry.label : undefined,
          state: business.state ?? state,
          address: business.address ?? profile.address,
          phone: business.phone ?? profile.phone,
          rating: profile.rating ?? undefined,
          reviewCount: profile.reviewCount ?? undefined,
        },
      });
    }

    if (isNewBusiness) {
      await trackEvent({ eventName: "business_discovered", businessId: business.id });
    }

    // Create a pending Audit record
    const audit = await prisma.audit.create({
      data: {
        businessId: business.id,
        status: "PENDING",
        score: 0,
      },
    });

    // Real, credential-free preliminary check — actually fetches the site.
    // (Just for the instant on-page feedback; the full real audit runs next.)
    const websiteCheck = await checkWebsite(website);

    // Hand off to the single audit engine (lib/audit/engine.ts). With
    // AUDIT_EXECUTION=inline it keeps running after this response returns;
    // with =queue the worker picks it up. Either way the wizard polls
    // /api/audit/progress/[id] for real progress.
    const engine = selectedEngine();
    const dispatched = await dispatchAudit(audit.id, { trigger: "self_serve" }, after);

    return NextResponse.json({
      pendingAuditId: audit.id,
      engine,
      execution: dispatched.mode,
      business: { name: business.name, city: business.city, state: business.state, country: business.country, category: business.category },
      preliminaryFindings: {
        sslValid: websiteCheck.sslValid,
        pageSpeedEstimate:
          websiteCheck.responseTimeMs === null
            ? "UNKNOWN"
            : websiteCheck.responseTimeMs > 3500
              ? "MOBILE_SLOW"
              : websiteCheck.responseTimeMs > 1200
                ? "MOBILE_AVERAGE"
                : "MOBILE_FAST",
        mobileOptimized: websiteCheck.mobileViewport,
      },
    }, { status: 202 });
  } catch (error) {
    console.error("Inbound trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function normalizeCountryCode(code?: string): string | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase();
  return c === "UK" ? "GB" : c;
}
