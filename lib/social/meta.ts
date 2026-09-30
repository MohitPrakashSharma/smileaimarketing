import { env } from "@/lib/env.server";

/*
 * Meta Graph API client for Facebook Pages and Instagram business accounts.
 *
 * Connect flow: Facebook Login → short-lived user token → long-lived user
 * token → the Page's own access token (which doesn't expire). Page tokens
 * publish to the Page and to the Instagram account linked to it.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const META_SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_read_user_content", // comment counts on the Page's posts
  "business_management",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
];

export function metaConfigured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

/**
 * Public address the platforms use to reach this server: the Facebook login
 * return and the image links Instagram downloads. Defaults to APP_BASE_URL;
 * set SOCIAL_PUBLIC_BASE_URL to a tunnel when testing from a local machine.
 */
export function socialPublicBaseUrl() {
  return (process.env.SOCIAL_PUBLIC_BASE_URL || env.APP_BASE_URL).replace(/\/$/, "");
}

export function metaRedirectUri() {
  return `${socialPublicBaseUrl()}/api/clinic/social/oauth/meta/callback`;
}

export function metaLoginUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: metaRedirectUri(),
    state,
    response_type: "code",
  });
  // Facebook Login for Business apps use a saved configuration instead of a scope list.
  if (process.env.META_LOGIN_CONFIG_ID) params.set("config_id", process.env.META_LOGIN_CONFIG_ID);
  else params.set("scope", META_SCOPES.join(","));
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
}

export class MetaError extends Error {
  constructor(
    message: string,
    public code?: number,
    public subcode?: number
  ) {
    super(message);
    this.name = "MetaError";
  }
  /** The token was revoked, expired or lost a permission — the clinic has to reconnect. */
  get needsReconnect() {
    return this.code === 190 || this.code === 102 || this.code === 10 || this.code === 200;
  }
}

async function graph<T>(path: string, init?: { method?: string; params?: Record<string, string>; body?: FormData | URLSearchParams }): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${GRAPH}${path}`);
  for (const [k, v] of Object.entries(init?.params ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, { method: init?.method ?? "GET", body: init?.body, signal: AbortSignal.timeout(60_000) });
  const data = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: number; error_subcode?: number; error_user_msg?: string } };
  if (!res.ok || data.error) {
    const e = data.error ?? {};
    throw new MetaError(e.error_user_msg || e.message || `Meta API error ${res.status}`, e.code, e.error_subcode);
  }
  return data as T;
}

export async function exchangeCodeForUserToken(code: string): Promise<string> {
  const short = await graph<{ access_token: string }>("/oauth/access_token", {
    params: { client_id: process.env.META_APP_ID!, client_secret: process.env.META_APP_SECRET!, redirect_uri: metaRedirectUri(), code },
  });
  // Swap for a long-lived user token; Page tokens derived from it never expire.
  const long = await graph<{ access_token: string }>("/oauth/access_token", {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID!,
      client_secret: process.env.META_APP_SECRET!,
      fb_exchange_token: short.access_token,
    },
  });
  return long.access_token;
}

export type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
};

export async function listPages(userToken: string): Promise<MetaPage[]> {
  const data = await graph<{ data: MetaPage[] }>("/me/accounts", {
    params: { fields: "id,name,access_token,instagram_business_account{id,username}", limit: "100", access_token: userToken },
  });
  return data.data ?? [];
}

// ── Publishing ────────────────────────────────────────────────────────────

export type PublishedRef = { id: string; url?: string };

/** Posts to a Facebook Page: a photo post when there's an image, a text post otherwise. */
export async function publishToFacebookPage(pageId: string, pageToken: string, message: string, image?: { data: Buffer; mimeType: string }): Promise<PublishedRef> {
  if (image) {
    const form = new FormData();
    form.set("caption", message);
    form.set("published", "true");
    form.set("access_token", pageToken);
    form.set("source", new Blob([new Uint8Array(image.data)], { type: image.mimeType }), "image.jpg");
    const res = await graph<{ id: string; post_id?: string }>(`/${pageId}/photos`, { method: "POST", body: form });
    const postId = res.post_id ?? res.id;
    return { id: postId, url: `https://www.facebook.com/${postId}` };
  }
  const res = await graph<{ id: string }>(`/${pageId}/feed`, {
    method: "POST",
    body: new URLSearchParams({ message, access_token: pageToken }),
  });
  return { id: res.id, url: `https://www.facebook.com/${res.id}` };
}

/**
 * Instagram publishing is two steps: create a media container from a public
 * JPEG URL (Instagram downloads it), wait until it's processed, then publish.
 */
export async function publishToInstagram(igUserId: string, token: string, caption: string, imageUrl: string): Promise<PublishedRef> {
  const container = await graph<{ id: string }>(`/${igUserId}/media`, {
    method: "POST",
    body: new URLSearchParams({ image_url: imageUrl, caption, access_token: token }),
  });

  for (let i = 0; i < 20; i++) {
    const { status_code } = await graph<{ status_code?: string }>(`/${container.id}`, { params: { fields: "status_code", access_token: token } });
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR" || status_code === "EXPIRED") throw new MetaError(`Instagram couldn't process the image (${status_code}).`);
    await new Promise((r) => setTimeout(r, 3000));
  }

  const media = await graph<{ id: string }>(`/${igUserId}/media_publish`, {
    method: "POST",
    body: new URLSearchParams({ creation_id: container.id, access_token: token }),
  });
  const { permalink } = await graph<{ permalink?: string }>(`/${media.id}`, { params: { fields: "permalink", access_token: token } }).catch(() => ({ permalink: undefined }));
  return { id: media.id, url: permalink };
}

// ── Engagement ────────────────────────────────────────────────────────────

export type Metrics = { impressions?: number | null; likes?: number | null; comments?: number | null; shares?: number | null };

/**
 * Reads what Meta reports for a Page post. Fields Meta won't give us stay null
 * rather than guessed. Views and reactions come from Page insights; the comment
 * count needs pages_read_user_content, which older connections may not have.
 */
export async function facebookPostMetrics(postId: string, pageToken: string): Promise<Metrics> {
  const out: Metrics = {};

  const post = await graph<{ shares?: { count?: number } }>(`/${postId}`, { params: { fields: "shares", access_token: pageToken } });
  out.shares = post.shares?.count ?? 0;

  try {
    const ins = await graph<{ data: Array<{ name: string; values?: Array<{ value: number | Record<string, number> }> }> }>(`/${postId}/insights`, {
      params: { metric: "post_media_view,post_reactions_by_type_total", access_token: pageToken },
    });
    const value = (name: string) => ins.data?.find((d) => d.name === name)?.values?.[0]?.value;
    const views = value("post_media_view");
    if (typeof views === "number") out.impressions = views;
    const reactions = value("post_reactions_by_type_total");
    if (reactions && typeof reactions === "object") out.likes = Object.values(reactions).reduce((a, b) => a + b, 0);
    else if (ins.data?.length) out.likes = 0;
  } catch {
    // Insights can lag for new posts; leave them unset.
  }

  try {
    const c = await graph<{ comments?: { summary?: { total_count?: number } } }>(`/${postId}`, {
      params: { fields: "comments.summary(total_count).limit(0)", access_token: pageToken },
    });
    out.comments = c.comments?.summary?.total_count ?? null;
  } catch {
    // Needs pages_read_user_content — granted on the next Reconnect.
  }
  return out;
}

export async function instagramMediaMetrics(mediaId: string, token: string): Promise<Metrics> {
  const media = await graph<{ like_count?: number; comments_count?: number }>(`/${mediaId}`, {
    params: { fields: "like_count,comments_count", access_token: token },
  });
  const out: Metrics = { likes: media.like_count ?? null, comments: media.comments_count ?? null };
  // Instagram renamed its reach metrics over time; try the current name, then the older one.
  for (const metric of ["views", "reach"]) {
    try {
      const ins = await graph<{ data: Array<{ name: string; values?: Array<{ value: number }>; total_value?: { value: number } }> }>(`/${mediaId}/insights`, {
        params: { metric, access_token: token },
      });
      const d = ins.data?.[0];
      const value = d?.total_value?.value ?? d?.values?.[0]?.value;
      if (typeof value === "number") {
        out.impressions = value;
        break;
      }
    } catch {
      // try the next metric name
    }
  }
  return out;
}
