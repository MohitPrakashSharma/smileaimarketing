import crypto from "crypto";
import { env } from "@/lib/env.server";

/*
 * Two small crypto helpers for social publishing:
 *  - encrypt/decrypt platform access tokens at rest (AES-256-GCM);
 *  - sign short-lived public links to post images, which Instagram fetches
 *    over the internet and so can't send our session cookie.
 *
 * Keys come from SOCIAL_TOKEN_KEY when set, otherwise they're derived from
 * JWT_SECRET (each purpose gets its own derived key). Changing either one
 * invalidates stored tokens — clinics then simply reconnect.
 */

function key(purpose: string) {
  const base = process.env.SOCIAL_TOKEN_KEY || env.JWT_SECRET;
  return crypto.createHash("sha256").update(`smileai:${purpose}:${base}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key("token"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(sealed: string): string {
  const [version, iv, tag, data] = sealed.split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unrecognised secret format");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key("token"), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

function hmac(purpose: string, value: string) {
  return crypto.createHmac("sha256", key(purpose)).update(value).digest("base64url");
}

/** `<mediaId>.<expiresAtSeconds>.<signature>` — valid until it expires, for that image only. */
export function signMediaToken(mediaId: string, ttlSeconds = 60 * 60 * 24) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${mediaId}.${exp}.${hmac("media", `${mediaId}.${exp}`)}`;
}

export function verifyMediaToken(token: string): string | null {
  const [mediaId, exp, sig] = token.split(".");
  if (!mediaId || !exp || !sig) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  const expected = hmac("media", `${mediaId}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? mediaId : null;
}

/** Signed, short-lived OAuth `state` so a callback can only complete a connect this server started. */
export function signState(payload: Record<string, string>, ttlSeconds = 15 * 60) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })).toString("base64url");
  return `${body}.${hmac("oauth-state", body)}`;
}

export function verifyState(state: string): Record<string, string> | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = hmac("oauth-state", body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Record<string, string> & { exp: number };
  if (data.exp < Date.now() / 1000) return null;
  return data;
}
