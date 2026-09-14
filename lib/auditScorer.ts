import { WebsiteSignals } from "./websiteAnalyzer";
import { industryFromCategory, cap, article } from "./industry";

export interface CategoryScoreResult {
  category: "LOCAL_VISIBILITY" | "WEBSITE_QUALITY" | "CONVERSION" | "REPUTATION" | "COMPETITOR_GAP";
  score: number;
  findingsJson: Record<string, unknown>;
  detailsJson: {
    title: string;
    description: string;
    recommendation: string;
  };
}

export interface AuditScoringOutput {
  opportunityScore: number;
  categoryScores: CategoryScoreResult[];
  competitors: Array<{ name: string; website?: string; rank: number; mapScore: number }>;
  summaryText: string;
}

export function computeAuditScores(params: {
  businessName: string;
  city: string;
  website: string;
  signals: WebsiteSignals;
  /** Business.category, e.g. "Dental Clinic" or "Plumbing Company" — drives all wording. */
  category?: string;
  /** Verified Google rating/review count. Leave undefined when unknown — never pass a guess. */
  rating?: number;
  reviewCount?: number;
  realCompetitors?: Array<{ name: string; website?: string; rank: number; mapScore: number; reviewCount?: number }>;
  ownRank?: number;
  marketChecked?: boolean;
}): AuditScoringOutput {
  const { businessName, city, signals, rating, reviewCount } = params;
  const ind = industryFromCategory(params.category);
  const searchPhrase = `${ind.searchKeyword} in ${city}`;

  // 1. Website Quality (max 100) — a site we couldn't load gets a real 0,
  // not a partial-credit baseline. No signal was actually observed, so none is claimed.
  let websiteScore: number;
  let websiteDescription: string;
  let websiteRecommendation: string;

  if (!signals.reachable) {
    websiteScore = 0;
    const issue = signals.error || (signals.httpStatus ? `Website responded with HTTP ${signals.httpStatus}` : "Website could not be reached");
    websiteDescription = `We tried to load ${businessName}'s website just now and it failed: ${issue}. Every ${ind.customer} searching for you online right now is hitting the exact same wall — this isn't a slow-load problem, it's a nobody-can-get-in problem.`;
    websiteRecommendation = `Fix this first, before anything else in this report — get the website reachable again. Nothing downstream (ads, email, Google listing clicks) can convert a visitor to a site that won't load.`;
  } else {
    websiteScore = 60;
    if (signals.isHttps) websiteScore += 15;
    if (signals.responseTimeMs < 2000) websiteScore += 15;
    if (signals.hasViewportMeta) websiteScore += 10;

    websiteDescription = signals.isHttps && signals.responseTimeMs < 2000
      ? `Your website loads quickly (${signals.responseTimeMs}ms) and uses a secure connection, so ${ind.customers} aren't scared off before they even see what you offer.`
      : !signals.isHttps
        ? `Your website loaded in ${signals.responseTimeMs}ms but isn't using a secure (HTTPS) connection — browsers flag this directly to visitors before they see anything else.`
        : `Your website takes ${signals.responseTimeMs}ms to load on a phone. Most people give up after three seconds and simply move on to the next ${ind.business} on the list — every slow load is a ${ind.customer} you may never hear from.`;
    websiteRecommendation = signals.isHttps
      ? "Keep new photos and pages compressed so your load time stays under 1.5 seconds as the site grows."
      : "Turn on a secure connection (HTTPS) as soon as possible — browsers actively warn visitors away from sites without one, and it's usually a same-day fix.";
  }

  const websiteDetails: CategoryScoreResult = {
    category: "WEBSITE_QUALITY",
    score: Math.min(100, websiteScore),
    findingsJson: {
      reachable: signals.reachable,
      error: signals.error || null,
      httpStatus: signals.httpStatus ?? null,
      ssl: signals.isHttps,
      responseTimeMs: signals.responseTimeMs,
      mobileViewport: signals.hasViewportMeta,
      pageTitle: signals.pageTitle || null,
    },
    detailsJson: {
      title: "How fast and trustworthy your website feels",
      description: websiteDescription,
      recommendation: websiteRecommendation,
    },
  };

  // 2. Conversion Experience (max 100) — can't observe a booking flow on a
  // page that never loaded, so this is 0 rather than a guessed baseline.
  let conversionScore: number;
  let conversionDescription: string;

  if (!signals.reachable) {
    conversionScore = 0;
    conversionDescription = `We couldn't evaluate the ${ind.booking} experience because the website itself didn't load (${signals.error || "unreachable"}). There's no click-to-call, ${ind.booking} button, or contact form to find if the page never opens.`;
  } else {
    conversionScore = 40;
    if (signals.hasClickToCall) conversionScore += 20;
    if (signals.hasBookingCta) conversionScore += 20;
    if (signals.hasContactForm) conversionScore += 20;
    conversionDescription = signals.hasBookingCta && signals.hasClickToCall
      ? `A visitor can call you or request ${article(ind.booking)} in one tap — you're not losing people at the finish line.`
      : `A ${ind.customer} has to hunt for your phone number or a way to get in touch. On a phone screen, that's often all it takes for someone to leave and call a competitor instead.`;
  }

  const conversionDetails: CategoryScoreResult = {
    category: "CONVERSION",
    score: Math.min(100, conversionScore),
    findingsJson: {
      reachable: signals.reachable,
      clickToCall: signals.hasClickToCall,
      bookingCta: signals.hasBookingCta,
      contactForm: signals.hasContactForm,
    },
    detailsJson: {
      title: `How easy it is for a ${ind.customer} to actually reach you`,
      description: conversionDescription,
      recommendation: signals.reachable
        ? `Add an always-visible 'Call Now' button and a simple two-step ${ind.booking} form ${ind.customers} can use without leaving the page.`
        : `Once the website is back up, make sure a 'Call Now' button and a simple ${ind.booking} form are visible without scrolling.`,
    },
  };

  // 3. Local Visibility (max 100) — uses the business's real local-pack rank
  // when we were able to check it; falls back to an honestly-labelled
  // estimate (never a fabricated rank) when no live lookup was available.
  const { ownRank, marketChecked = false } = params;

  let localScore: number;
  let localDescription: string;

  if (marketChecked && ownRank !== undefined) {
    if (ownRank <= 3) {
      localScore = 90;
      localDescription = `Good news: when someone nearby searches "${searchPhrase}," ${businessName} shows up at position #${ownRank} — right in the top 3, where almost all the clicks go.`;
    } else if (ownRank <= 10) {
      localScore = 55;
      localDescription = `${businessName} currently ranks #${ownRank} when someone nearby searches "${searchPhrase}." That's visible, but the top 3 gets almost all the clicks — everyone below it is splitting what's left.`;
    } else {
      localScore = 35;
      localDescription = `${businessName} ranks #${ownRank} for "${searchPhrase}" — deep enough that most ${ind.customers} scrolling past the first few results simply won't find you.`;
    }
  } else if (marketChecked) {
    localScore = 25;
    localDescription = `We checked the top local results for "${searchPhrase}" and ${businessName} didn't appear at all — which means most nearby ${ind.customers} are finding someone else first.`;
  } else {
    localScore = reviewCount != null ? (reviewCount > 50 ? 65 : 45) : 50;
    localDescription =
      reviewCount != null
        ? `We couldn't pull a live Google ranking for ${businessName} this time, so this score is an estimate based on your ${reviewCount} Google reviews rather than a verified position.`
        : `We couldn't pull a live Google ranking for "${searchPhrase}" this time, so this score is a neutral placeholder rather than a verified position.`;
  }

  const localDetails: CategoryScoreResult = {
    category: "LOCAL_VISIBILITY",
    score: localScore,
    findingsJson: { city, ownRank: ownRank ?? null, verified: marketChecked },
    detailsJson: {
      title: `Where you show up when ${ind.customers} search nearby`,
      description: localDescription,
      recommendation: `Make sure your ${ind.business}'s name, address, and phone number match exactly everywhere they appear online, and fill out every section of your Google Business Profile — this is the single biggest lever for moving up.`,
    },
  };

  // 4. Reviews & Reputation (max 100) — only ever describes a verified
  // rating/review count. With neither, the score is a neutral 50 and the
  // copy says so, rather than inventing "45 reviews at 4.5 stars".
  const hasReputationData = rating != null || reviewCount != null;
  let reputationScore = 50;
  if (rating != null && rating >= 4.5) reputationScore += 25;
  else if (rating != null && rating < 4.0) reputationScore -= 15;
  if (reviewCount != null && reviewCount >= 50) reputationScore += 25;
  else if (reviewCount != null && reviewCount < 10) reputationScore -= 15;
  reputationScore = Math.max(10, Math.min(100, reputationScore));

  const ratingText = rating != null ? `${rating} stars` : "an unverified rating";
  const reputationDescription = !hasReputationData
    ? `We couldn't find a verified Google listing for ${businessName} to pull reviews from. That's a finding in itself — if ${ind.customers} can't find your reviews, they can't be reassured by them.`
    : reviewCount != null && reviewCount >= 50
      ? `${businessName} has ${reviewCount} Google reviews at ${ratingText} in ${city} — a solid foundation that new ${ind.customers} trust when they're comparing ${ind.businesses}.`
      : `${businessName} has ${reviewCount ?? "few"} Google reviews at ${ratingText} in ${city}. New ${ind.customers} almost always compare review counts before they look at anything else — a thin number here can quietly cost you the decision, even when the reviews you do have are great.`;

  const reputationDetails: CategoryScoreResult = {
    category: "REPUTATION",
    score: reputationScore,
    findingsJson: { rating: rating ?? null, reviewCount: reviewCount ?? null, verified: hasReputationData },
    detailsJson: {
      title: "How your reviews stack up",
      description: reputationDescription,
      recommendation: `Set up a simple text or email that goes out to every ${ind.customer} afterwards asking for a quick review. ${cap(ind.businesses)} that automate this usually see their review count climb within weeks, without anyone having to remember to ask.`,
    },
  };

  // 5. Competitor Gap (max 100) — computed from the real competitor list
  // when a live lookup ran; otherwise a neutral score with honest copy.
  const competitors = params.realCompetitors || [];
  const competitorReviewCounts = competitors.map((c) => c.reviewCount).filter((n): n is number => typeof n === "number");
  const topCompetitorReviews = competitorReviewCounts.length ? Math.max(...competitorReviewCounts) : null;
  const reviewGap = topCompetitorReviews != null && reviewCount != null ? Math.max(0, topCompetitorReviews - reviewCount) : null;

  let competitorGapScore: number;
  let competitorDescription: string;
  if (competitors.length > 0) {
    competitorGapScore = ownRank != null && ownRank <= 3 ? 80 : ownRank != null ? 55 : 40;
    if (reviewGap != null && reviewGap > 0) competitorGapScore -= Math.min(20, Math.round(reviewGap / 10));
    competitorGapScore = Math.max(15, Math.min(100, competitorGapScore));
    const leader = competitors[0];
    competitorDescription =
      reviewGap != null && reviewGap > 0
        ? `${leader.name} leads the local results for "${searchPhrase}" with ${topCompetitorReviews} Google reviews — ${reviewGap} more than ${businessName}. The top 3 take the large majority of clicks, and right now those ${ind.customers} are going there first.`
        : `The ${ind.businesses} ahead of you for "${searchPhrase}" — starting with ${leader.name} — are taking the large majority of local clicks. Below is exactly what they have in place that you don't yet.`;
  } else {
    competitorGapScore = 50;
    competitorDescription = `We didn't run a live competitor comparison for "${searchPhrase}" on this pass, so this score is neutral. In every local market the top 3 results take the large majority of clicks — the fixes below are what move a ${ind.business} into that group.`;
  }

  const competitorDetails: CategoryScoreResult = {
    category: "COMPETITOR_GAP",
    score: competitorGapScore,
    findingsJson: {
      topCompetitorCount: competitors.length,
      reviewGap,
      topCompetitorReviews,
      verified: competitors.length > 0,
    },
    detailsJson: {
      title: `What the ${ind.businesses} ahead of you are doing right`,
      description: competitorDescription,
      recommendation: `A focused push on reviews and local search visibility, kept up consistently, is what moves a ${ind.business} from page two into that top 3 — usually within a few months, not years.`,
    },
  };

  const categoryScores = [
    websiteDetails,
    conversionDetails,
    localDetails,
    reputationDetails,
    competitorDetails,
  ];

  // Overall Opportunity Score (weighted average calculation)
  const totalCategoryScores = categoryScores.reduce((acc, curr) => acc + curr.score, 0);
  const rawAvg = Math.round(totalCategoryScores / categoryScores.length);
  // Opportunity score represents practice growth potential (100 - average audit score, clamped)
  const opportunityScore = Math.max(35, Math.min(95, 100 - Math.round(rawAvg * 0.4)));

  // Competitors are never fabricated: real lookups only (see lib/discoveryProvider.ts#findLocalMarketPosition).
  const summaryText = `${businessName}'s Opportunity Score is ${opportunityScore}/100 in ${city} — ${ind.customers} searching nearby right now are finding you for some of what matters, and finding someone else for the rest. Below is exactly where each stands, and the two or three fixes worth prioritizing first.`;

  return {
    opportunityScore,
    categoryScores,
    competitors,
    summaryText,
  };
}
