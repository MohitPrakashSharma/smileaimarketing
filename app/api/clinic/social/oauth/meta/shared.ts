import { socialPublicBaseUrl } from "@/lib/social/meta";
import { NextResponse } from "next/server";

export const NONCE_COOKIE = "meta_oauth_nonce";
export const PENDING_COOKIE = "meta_oauth_pending";
export const COOKIE_PATH = "/api/clinic/social/oauth/meta";

/**
 * Back to the Social media page with a result code the page turns into a message.
 * Built from the public address Facebook returned to — behind a proxy or tunnel,
 * request.url reports the internal host (localhost), which the browser can't reach.
 */
export function backToSocial(_request: Request, result: string) {
  const url = new URL("/clinic/social", socialPublicBaseUrl());
  url.searchParams.set("meta", result);
  return NextResponse.redirect(url);
}

export function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export const cookieOpts = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: COOKIE_PATH,
  maxAge,
});
