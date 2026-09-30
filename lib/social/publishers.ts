import crypto from "crypto";
import type { SocialPlatform } from "@prisma/client";
import { getLiveAccount, markAccountError, type LiveAccount } from "./accounts";
import { MetaError, publishToFacebookPage, publishToInstagram, socialPublicBaseUrl } from "./meta";
import { readMediaFile, toJpeg } from "./media";
import { signMediaToken } from "./secrets";

/*
 * One adapter per platform. A platform publishes for real when the clinic has
 * connected it (Social media → Accounts); otherwise it runs in TEST mode:
 * nothing leaves the server and a simulated id is recorded. Engagement
 * metrics are never invented — they stay null until a live platform reports them.
 *
 * Live today: Facebook Pages and Instagram (Meta Graph API).
 * Still test-only: TikTok (Content Posting API, needs an audited app) and
 * LinkedIn (Community Management API for company pages).
 */

export type PublishTarget = { id: string; platform: SocialPlatform; caption: string };
export type PublishMedia = { id: string; path: string; mimeType: string };
export type PublishContext = { clinicId: string; clinicName: string; media: PublishMedia | null };

export type PublishResult =
  | { ok: true; mode: "test" | "live"; externalId: string; externalUrl?: string }
  | { ok: false; mode: "test" | "live"; error: string };

type LiveFn = (target: PublishTarget, ctx: PublishContext, account: LiveAccount) => Promise<{ id: string; url?: string }>;

const ADAPTERS: Record<SocialPlatform, { prefix: string; maxLength: number; live?: LiveFn }> = {
  INSTAGRAM: { prefix: "ig", maxLength: 2200, live: liveInstagram },
  FACEBOOK: { prefix: "fb", maxLength: 63206, live: liveFacebook },
  TIKTOK: { prefix: "tt", maxLength: 2200 },
  LINKEDIN: { prefix: "li", maxLength: 3000 },
};

async function liveFacebook(target: PublishTarget, ctx: PublishContext, account: LiveAccount) {
  const image = ctx.media ? { data: await toJpeg(await readMediaFile(ctx.media), ctx.media.mimeType), mimeType: "image/jpeg" } : undefined;
  return publishToFacebookPage(account.externalId, account.token, target.caption, image);
}

async function liveInstagram(target: PublishTarget, ctx: PublishContext, account: LiveAccount) {
  if (!ctx.media) throw new Error("Instagram posts need an image.");
  const base = socialPublicBaseUrl();
  if (/^https?:\/\/(localhost|127\.|\[::1\])/.test(base)) {
    throw new Error("Instagram downloads the image from a public web address, and this server is only running locally. Set SOCIAL_PUBLIC_BASE_URL (for example a tunnel) or publish from the live site.");
  }
  const imageUrl = `${base}/api/public/social-media/${signMediaToken(ctx.media.id)}.jpg`;
  return publishToInstagram(account.externalId, account.token, target.caption, imageUrl);
}

export async function publishToPlatform(target: PublishTarget, ctx: PublishContext): Promise<PublishResult> {
  const adapter = ADAPTERS[target.platform];
  const caption = target.caption.trim();

  if (!caption) return { ok: false, mode: "test", error: "Caption is empty." };
  if (caption.length > adapter.maxLength) {
    return { ok: false, mode: "test", error: `Caption is ${caption.length} characters; the limit is ${adapter.maxLength}.` };
  }

  const account = adapter.live ? await getLiveAccount(ctx.clinicId, target.platform) : null;
  if (adapter.live && account) {
    try {
      const ref = await adapter.live({ ...target, caption }, ctx, account);
      return { ok: true, mode: "live", externalId: ref.id, externalUrl: ref.url };
    } catch (err) {
      if (err instanceof MetaError && err.needsReconnect) {
        await markAccountError(account.id, err.message);
        return { ok: false, mode: "live", error: `${err.message} — reconnect this account in Social media → Accounts.` };
      }
      return { ok: false, mode: "live", error: err instanceof Error ? err.message : "Publishing failed." };
    }
  }

  // Test mode: record a simulated id so the tracking table shows exactly what would have gone out.
  return { ok: true, mode: "test", externalId: `test_${adapter.prefix}_${crypto.randomBytes(6).toString("hex")}` };
}
