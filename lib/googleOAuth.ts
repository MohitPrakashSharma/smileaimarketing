import { prisma } from "./prisma";
import { env } from "./env.server";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const TOKEN_ROW_ID = "default";

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REDIRECT_URI);
}

/** Builds the URL to redirect an admin to for Google's consent screen. */
export function buildGoogleConsentUrl(state: string): string {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth is not configured (missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI)");
  }
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: `${CALENDAR_SCOPE} email`,
    access_type: "offline",
    prompt: "consent", // forces a refresh_token even on repeat connections
    state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/** Exchanges a consent-screen authorization code for tokens and stores them. */
export async function exchangeCodeAndStoreToken(code: string, connectedByUserId?: string): Promise<void> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI) {
    throw new Error("Google OAuth is not configured");
  }

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const tokens = (await res.json()) as GoogleTokenResponse;
  if (!tokens.refresh_token) {
    throw new Error(
      "Google didn't return a refresh token — this happens if the app was already authorized without prompt=consent. Revoke access at https://myaccount.google.com/permissions and try connecting again."
    );
  }

  const googleAccountEmail = await fetchGoogleAccountEmail(tokens.access_token);

  await prisma.googleCalendarToken.upsert({
    where: { id: TOKEN_ROW_ID },
    create: {
      id: TOKEN_ROW_ID,
      googleAccountEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
      connectedByUserId,
    },
    update: {
      googleAccountEmail,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope,
      connectedByUserId,
    },
  });
}

async function fetchGoogleAccountEmail(accessToken: string): Promise<string | undefined> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return typeof data.email === "string" ? data.email : undefined;
  } catch {
    return undefined;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth is not configured");
  }
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${errText.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Returns a valid access token for the connected Google account, refreshing
 * it first if it's expired. Returns null if no account is connected at all
 * — callers must treat that as "not connected," never proceed with a call
 * that has no real chance of authenticating.
 */
export async function getValidGoogleAccessToken(): Promise<string | null> {
  const stored = await prisma.googleCalendarToken.findUnique({ where: { id: TOKEN_ROW_ID } });
  if (!stored) return null;

  // Refresh a little before actual expiry to avoid a race against in-flight requests.
  const isExpiringSoon = stored.expiresAt.getTime() - Date.now() < 60_000;
  if (!isExpiringSoon) return stored.accessToken;

  const refreshed = await refreshAccessToken(stored.refreshToken);
  await prisma.googleCalendarToken.update({
    where: { id: TOKEN_ROW_ID },
    data: {
      accessToken: refreshed.access_token,
      expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return refreshed.access_token;
}

export async function getConnectedGoogleAccount(): Promise<{ email?: string; connectedAt: Date } | null> {
  const stored = await prisma.googleCalendarToken.findUnique({ where: { id: TOKEN_ROW_ID } });
  if (!stored) return null;
  return { email: stored.googleAccountEmail || undefined, connectedAt: stored.createdAt };
}

export async function disconnectGoogleAccount(): Promise<void> {
  await prisma.googleCalendarToken.deleteMany({ where: { id: TOKEN_ROW_ID } });
}
