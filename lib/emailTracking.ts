import { createHmac, timingSafeEqual } from "crypto";
import type { EmailStatus } from "@prisma/client";
import { env } from "./env.server";

/*
 * Open and click tracking for outbound email.
 *
 * Opens: a 1x1 GIF at /api/t/o/<messageId>. Image proxies (Gmail) and privacy
 * features (Apple Mail) fetch it without a human reading, and clients that block
 * images never fetch it — so opens are a signal, not a count of readers.
 *
 * Clicks: every http(s) link is rewritten to /api/t/c/<messageId>?u=<url>&s=<sig>.
 * The HMAC signature pins each redirect to the URL we actually sent, so the
 * endpoint can't be used as an open redirect.
 */

function sign(messageId: string, url: string): string {
  return createHmac("sha256", env.WEBHOOK_SECRET).update(`click:${messageId}:${url}`).digest("base64url").slice(0, 22);
}

export function verifyClickSignature(messageId: string, url: string, sig: string): boolean {
  const expected = Buffer.from(sign(messageId, url));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function clickUrl(messageId: string, url: string): string {
  const q = new URLSearchParams({ u: url, s: sign(messageId, url) });
  return `${env.APP_BASE_URL}/api/t/c/${messageId}?${q}`;
}

export function openPixelUrl(messageId: string): string {
  return `${env.APP_BASE_URL}/api/t/o/${messageId}`;
}

/**
 * Rewrites links for click tracking and appends the open pixel. The unsubscribe
 * link is left direct: it must work even if tracking is down, and a click on it
 * isn't engagement.
 */
export function instrumentEmailHtml(html: string, messageId: string): string {
  const tracked = html.replace(/href="(https?:\/\/[^"]+)"/g, (match, raw: string) => {
    const url = raw.replace(/&amp;/g, "&");
    if (url.includes("/unsubscribe")) return match;
    return `href="${clickUrl(messageId, url).replace(/&/g, "&amp;")}"`;
  });
  const pixel = `<img src="${openPixelUrl(messageId)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  return tracked.includes("</body>") ? tracked.replace("</body>", `${pixel}</body>`) : tracked + pixel;
}

// Engagement only moves forward: a late open never demotes a clicked or replied email.
const RANK: Record<EmailStatus, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, OPENED: 3, CLICKED: 4, REPLIED: 5, BOUNCED: -1 };

export function advanceStatus(current: EmailStatus, next: EmailStatus): EmailStatus {
  if (current === "BOUNCED" || current === "QUEUED") return current;
  return RANK[next] > RANK[current] ? next : current;
}
