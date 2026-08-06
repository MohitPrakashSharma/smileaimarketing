import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAdminSession } from "@/lib/auth";
import { buildGoogleConsentUrl, isGoogleOAuthConfigured } from "@/lib/googleOAuth";

/** Kicks off the Google consent flow — admin clicks "Connect Google Calendar" and lands here. */
export async function GET(request: Request) {
  const admin = await getAdminSession(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI)" },
      { status: 422 }
    );
  }

  const state = crypto.randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildGoogleConsentUrl(state));

  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — just long enough to complete the consent screen
    sameSite: "lax",
  });

  return response;
}
