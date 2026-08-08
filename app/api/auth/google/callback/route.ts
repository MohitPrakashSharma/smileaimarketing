import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { exchangeCodeAndStoreToken } from "@/lib/googleOAuth";
import { env } from "@/lib/env.server";

function readCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(cookieHeader.split(";").map((c) => c.trim().split("=")));
  return cookies[name];
}

/** Google redirects here after the admin approves (or denies) calendar access. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = (status: "connected" | "error", message?: string) => {
    // Use the configured public base URL rather than the request's own origin —
    // behind the reverse proxy, request.url resolves to the container's
    // internal bind address (0.0.0.0:3000), not the public host.
    const target = new URL("/admin/integrations", env.APP_BASE_URL);
    target.searchParams.set("google_calendar", status);
    if (message) target.searchParams.set("message", message);
    const res = NextResponse.redirect(target);
    res.cookies.delete("google_oauth_state");
    return res;
  };

  const admin = await getAdminSession(request);
  if (!admin) {
    return redirectTo("error", "You were signed out during the consent flow — please log in and try again.");
  }

  const googleError = url.searchParams.get("error");
  if (googleError) {
    return redirectTo("error", `Google denied access: ${googleError}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, "google_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectTo("error", "The consent flow expired or was tampered with — please try connecting again.");
  }

  try {
    await exchangeCodeAndStoreToken(code, admin.id);
    return redirectTo("connected");
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return redirectTo("error", err instanceof Error ? err.message : "Failed to complete Google connection.");
  }
}
