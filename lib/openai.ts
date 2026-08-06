export interface AuditSummaryInput {
  businessName: string;
  website: string;
  city: string;
  overallScore: number;
  results: Array<{ category: string; score: number }>;
  competitors?: Array<{ name: string; rank: number }>;
  /** Set only when the website was actually unreachable — the exact real cause, never guessed. */
  websiteIssue?: string;
}

export interface AuditSummaryOutput {
  summary: string;
  topFindings: string[];
  recommendedActions: string[];
  emailSubject: string;
  emailOpening: string;
  salesTalkingPoints: string[];
  modelUsed?: string;
  tokensUsed?: number;
  isAiGenerated: boolean;
  error?: string;
}

export async function generateAuditSummaryWithOpenAI(
  input: AuditSummaryInput
): Promise<AuditSummaryOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // Fallback template builder if OpenAI key is missing or fails
  const buildTemplateFallback = (errMsg?: string): AuditSummaryOutput => ({
    summary: input.websiteIssue
      ? `${input.businessName}'s website in ${input.city} is currently down: ${input.websiteIssue}. That's the headline finding — every other score in this report is capped until that's fixed, because no patient can reach the site to see anything else.`
      : `${input.businessName} has an Opportunity Score of ${input.overallScore}/100 in ${input.city}. Patients nearby are searching for a dentist right now — this report shows where you're winning that search and where you're not.`,
    topFindings: input.websiteIssue
      ? [
          `Website is unreachable right now: ${input.websiteIssue}.`,
          `Opportunity Score: ${input.overallScore}/100 — website and conversion are scored at 0 until this is fixed, not estimated.`,
          `Local search visibility and reviews are unaffected by this and are scored normally below.`,
        ]
      : [
          `Opportunity Score: ${input.overallScore}/100, based on what's actually visible online today.`,
          `Your website and booking experience have real room to convert more visitors into booked patients.`,
          `Local search visibility is worth a closer look — it's often the single biggest lever.`,
        ],
    recommendedActions: input.websiteIssue
      ? [
          `Get the website back online first — ${input.websiteIssue}.`,
          "Once it's reachable, re-run this audit to get a real website and conversion score.",
          "Fill out every field on your Google Business Profile in the meantime — that's independent of the website outage.",
        ]
      : [
          "Make it a one-tap process for a patient to call or book from their phone.",
          "Fill out every field on your Google Business Profile and keep your listing details consistent everywhere online.",
          "Get your website loading fast and securely so patients don't bounce before they see it.",
        ],
    emailSubject: input.websiteIssue
      ? `${input.businessName}'s website looks to be down`
      : `A quick look at ${input.businessName}'s patient visibility`,
    emailOpening: input.websiteIssue
      ? `Hi — while running a free visibility audit on ${input.businessName}, we noticed the website isn't loading (${input.websiteIssue}) — flagging it directly in case you weren't aware.`
      : `Hi — we ran a free growth audit on ${input.businessName} and found a few things worth a look.`,
    salesTalkingPoints: input.websiteIssue
      ? [
          `Lead with the outage — it's the single fact that matters most and it's independently verifiable by just visiting the site.`,
          `Everything else in the report is real too, but the website being down is what's costing them patients today.`,
        ]
      : [
          `The Opportunity Score (${input.overallScore}/100) is a plain-English way to talk about where patients are being lost.`,
          "Lead with the fastest, cheapest fix first — usually the booking experience — to build trust before anything bigger.",
        ],
    isAiGenerated: false,
    error: errMsg,
  });

  if (!apiKey) {
    return buildTemplateFallback("OPENAI_API_KEY is not configured");
  }

  try {
    const prompt = `You're writing the opening summary of a growth audit for a dental practice. The reader is the dentist/owner themselves, not a marketing professional — write like a trusted colleague explaining the numbers over coffee, not like an ad agency pitch deck. Plain English, no jargon (no "CTA," "conversion funnel," "SEO" without explanation), warm but direct, and honest about what the data does and doesn't show.

Real audit data for "${input.businessName}" (${input.website}) in ${input.city}:
- Overall Opportunity Score: ${input.overallScore}/100
- Category Scores: ${JSON.stringify(input.results)}
- Real nearby competitors found: ${JSON.stringify(input.competitors || [])}
${input.websiteIssue ? `- IMPORTANT — the website could not be loaded at all when we checked. Exact cause: "${input.websiteIssue}". This is a real, verified fact, not a low score guess. Lead the summary with this — it's more urgent than any category score, and the website/conversion scores of 0 reflect "couldn't observe anything," not "observed something bad."` : ""}

Provide strict JSON output matching schema:
{
  "summary": "2-3 sentences, plain language, doctor-to-doctor tone — what's working, what's costing them patients, framed around real patients and real competitors, not abstract scores",
  "topFindings": ["finding 1", "finding 2", "finding 3"],
  "recommendedActions": ["action 1", "action 2", "action 3"],
  "emailSubject": "A plain, specific subject line — no hype, no clickbait",
  "emailOpening": "One warm, direct opening line for an email to this practice owner",
  "salesTalkingPoints": ["talking point 1", "talking point 2"]
}

Do not invent revenue, patient counts, or ranks beyond what's given above. Base every claim strictly on the scores and competitors provided — if competitors is empty, do not name or imply any specific competitor.`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return buildTemplateFallback(`OpenAI HTTP ${res.status}: ${errText.slice(0, 100)}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content;
    const tokens = data.usage?.total_tokens;

    if (!contentText) {
      return buildTemplateFallback("Empty content returned from OpenAI");
    }

    const parsed = JSON.parse(contentText);
    return {
      summary: parsed.summary || "Audit complete.",
      topFindings: Array.isArray(parsed.topFindings) ? parsed.topFindings : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
      emailSubject: parsed.emailSubject || `A quick look at ${input.businessName}'s patient visibility`,
      emailOpening: parsed.emailOpening || `Hi — we ran a free growth audit on ${input.businessName} and found a few things worth a look.`,
      salesTalkingPoints: Array.isArray(parsed.salesTalkingPoints) ? parsed.salesTalkingPoints : [],
      modelUsed: model,
      tokensUsed: tokens,
      isAiGenerated: true,
    };
  } catch (err) {
    console.error("[OpenAI Service] Error:", err);
    return buildTemplateFallback(err instanceof Error ? err.message : "OpenAI execution failed");
  }
}
