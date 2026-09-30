import { AiError, completeJson } from "@/lib/audit/ai/openaiClient";
import { PLATFORMS, isPlatform, type Platform } from "./platforms";

/*
 * The social media agent: one chat turn in, one reply out. It drafts a post
 * with copy tailored to each platform, and hands the platform choice back to
 * the person — it only preselects platforms they named themselves.
 */

export type AgentMessage = { role: "user" | "assistant"; content: string };

export type AgentDraft = {
  topic: string;
  caption: string;
  hashtags: string[];
  platformCaptions: Record<Platform, string>;
  /** What the post's image should show — fed to the image model. */
  imagePrompt: string;
};

export type AgentTurn = {
  reply: string;
  draft?: AgentDraft;
  platforms?: Platform[];
  scheduledFor?: string;
};

export type AgentClinic = { name: string; city?: string | null; province?: string | null; website?: string | null };

function systemPrompt(clinic: AgentClinic, now: Date) {
  const where = [clinic.city, clinic.province].filter(Boolean).join(", ");
  return `You are the social media assistant for ${clinic.name}${where ? `, a dental clinic in ${where}` : ", a dental clinic"}. Clinic staff chat with you to create posts for the clinic's own social accounts.

Current date and time: ${now.toISOString()} (convert any requested time to ISO 8601; assume the clinic's local time is America/Toronto unless told otherwise).

Rules for content:
- Accurate, friendly, non-alarmist dental health information. No medical claims, guarantees, diagnoses or before/after promises.
- Never include patient names, photos or any patient information.
- Write in Canadian English. Don't invent prices, offers, staff names or opening hours — if the post needs such a detail and the user didn't give it, ask for it instead of drafting.
- Tailor copy per platform:
  • INSTAGRAM: warm, 1–3 short paragraphs, a few emojis, ends with 5–8 relevant hashtags.
  • FACEBOOK: conversational, community tone, a clear call to action (book, call, visit), at most 2 hashtags.
  • TIKTOK: a punchy one-line hook first, short caption for a video, 3–5 hashtags.
  • LINKEDIN: professional and informative, no emojis, 2–3 hashtags at the end.

How to respond:
- If the request is too vague to write a good post, ask ONE short clarifying question and return no draft.
- If the user asks for a post (e.g. "publish a post about the benefits of floss"), write the draft. Your reply briefly says what you wrote and then asks which platforms to publish to (Instagram, Facebook, TikTok, LinkedIn) — unless they already named them, in which case ask them to review and confirm.
- If they ask to change the draft, return the full revised draft.
- Every draft includes an imagePrompt: one or two sentences describing a photo that suits the post (objects, setting, mood). No text or lettering in the image, no identifiable patients, no close-ups of mouths or procedures. If the user asks for a different picture, change imagePrompt to match.
- For anything unrelated to the clinic's social media, politely steer back.

Return ONLY a JSON object:
{
  "reply": string,                       // what you say to the user, plain text
  "draft": null | {
    "topic": string,                     // 2–6 word title, e.g. "Benefits of flossing"
    "caption": string,                   // neutral base caption
    "hashtags": string[],                // without the # sign
    "platformCaptions": { "INSTAGRAM": string, "FACEBOOK": string, "TIKTOK": string, "LINKEDIN": string },
    "imagePrompt": string                // description of the picture for this post
  },
  "platforms": string[],                 // ONLY platforms the user explicitly named in the conversation (insta/ig → INSTAGRAM, fb → FACEBOOK, tiktok → TIKTOK, linkedin → LINKEDIN); otherwise []
  "scheduledFor": string | null          // ISO 8601 only if the user asked for a specific time
}`;
}

function str(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

function parseTurn(text: string): AgentTurn {
  const raw = JSON.parse(text) as Record<string, unknown>;
  const reply = str(raw.reply);
  if (!reply) throw new AiError("invalid_output", "Agent reply was empty");

  const turn: AgentTurn = { reply };

  const d = raw.draft as Record<string, unknown> | null | undefined;
  if (d && typeof d === "object") {
    const pc = (d.platformCaptions ?? {}) as Record<string, unknown>;
    const caption = str(d.caption);
    const platformCaptions = Object.fromEntries(PLATFORMS.map((p) => [p, str(pc[p]) || caption])) as Record<Platform, string>;
    if (caption || PLATFORMS.some((p) => platformCaptions[p])) {
      turn.draft = {
        topic: str(d.topic) || "Social post",
        caption: caption || platformCaptions.FACEBOOK,
        hashtags: Array.isArray(d.hashtags) ? d.hashtags.map((h) => str(h).replace(/^#/, "")).filter(Boolean).slice(0, 15) : [],
        platformCaptions,
        imagePrompt: str(d.imagePrompt) || `A bright, friendly image illustrating: ${str(d.topic) || caption.slice(0, 120)}`,
      };
    }
  }

  if (Array.isArray(raw.platforms)) {
    const platforms = [...new Set(raw.platforms.map((p) => str(p).toUpperCase()).filter(isPlatform))];
    if (platforms.length) turn.platforms = platforms;
  }

  const when = str(raw.scheduledFor);
  if (when && !Number.isNaN(Date.parse(when))) turn.scheduledFor = new Date(when).toISOString();

  return turn;
}

/** Friendly wording for failures the user can see in the chat. */
export function agentErrorMessage(err: unknown): string {
  if (err instanceof AiError) {
    switch (err.code) {
      case "no_api_key":
      case "auth":
        return "The AI assistant isn't set up yet (no working OpenAI key). Ask Smile AI Marketing to connect it.";
      case "rate_limited":
        return "The AI assistant is busy right now. Try again in a minute.";
      case "timeout":
        return "The AI assistant took too long to answer. Try again.";
      default:
        return "The AI assistant couldn't answer that. Try rephrasing or try again.";
    }
  }
  return "The AI assistant couldn't answer that. Try again.";
}

export async function runSocialAgent(clinic: AgentClinic, messages: AgentMessage[]): Promise<AgentTurn> {
  const opts = { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL || "gpt-4o-mini", timeoutMs: 60_000 };
  const chat = [
    { role: "system" as const, content: systemPrompt(clinic, new Date()) },
    // completeJson only takes system/user roles; earlier assistant turns are replayed as labelled context.
    ...messages.map((m) => ({
      role: "user" as const,
      content: m.role === "assistant" ? `[Your previous reply]\n${m.content}` : m.content,
    })),
  ];

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await completeJson(opts, chat, 3000);
      return parseTurn(out.text);
    } catch (err) {
      lastErr = err;
      const retryable = err instanceof SyntaxError || (err instanceof AiError && err.retryable);
      if (!retryable) break;
    }
  }
  throw lastErr;
}
