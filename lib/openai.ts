export interface AuditSummaryInput {
  businessName: string;
  website: string;
  city: string;
  overallScore: number;
  results: Array<{ category: string; score: number }>;
  competitors?: Array<{ name: string; rank: number }>;
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
    summary: `${input.businessName} in ${input.city} achieved an overall audit score of ${input.overallScore}/100. High-impact optimization opportunities were identified across site performance and local search conversion.`,
    topFindings: [
      `Overall audit score evaluated at ${input.overallScore}/100 based on verified technical signals.`,
      `Website quality and conversion readiness show potential for patient acquisition growth.`,
      `Local search visibility requires structured profile and review optimization.`,
    ],
    recommendedActions: [
      "Implement mobile-first click-to-call CTAs above the fold.",
      "Optimize Google Business Profile category targeting and local citations.",
      "Accelerate page load speeds and SSL response times.",
    ],
    emailSubject: `Dental Audit Executive Findings for ${input.businessName}`,
    emailOpening: `Hello Dr. Lead, we analyzed the digital visibility and consultation booking experience for ${input.businessName}.`,
    salesTalkingPoints: [
      `Highlight the current audit score of ${input.overallScore}/100 compared to local market benchmarks.`,
      "Focus on missing mobile conversion elements as quick wins.",
    ],
    isAiGenerated: false,
    error: errMsg,
  });

  if (!apiKey) {
    return buildTemplateFallback("OPENAI_API_KEY is not configured");
  }

  try {
    const prompt = `Analyze this real dental audit data for "${input.businessName}" (${input.website}) in ${input.city}:
- Overall Audit Score: ${input.overallScore}/100
- Category Scores: ${JSON.stringify(input.results)}
- Local Competitors: ${JSON.stringify(input.competitors || [])}

Provide strict JSON output matching schema:
{
  "summary": "2-3 sentence executive summary based strictly on provided scores",
  "topFindings": ["finding 1", "finding 2", "finding 3"],
  "recommendedActions": ["action 1", "action 2", "action 3"],
  "emailSubject": "Compelling subject line",
  "emailOpening": "Professional email opening",
  "salesTalkingPoints": ["talking point 1", "talking point 2"]
}

Do not invent revenue, patient counts, or fake ranks. Base findings only on scores.`;

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
      emailSubject: parsed.emailSubject || `Dental Visibility Findings for ${input.businessName}`,
      emailOpening: parsed.emailOpening || `Hello ${input.businessName} team,`,
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
