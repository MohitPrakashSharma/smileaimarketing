import type { Platform } from "@/lib/social/platforms";

export type TargetStatus = "PENDING" | "PUBLISHED" | "FAILED" | "CANCELLED";
export type PostStatus = "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "PARTIAL" | "FAILED" | "CANCELLED";

export type PostTarget = {
  id: string;
  platform: Platform;
  caption: string;
  status: TargetStatus;
  mode: string;
  externalId: string | null;
  externalUrl: string | null;
  publishedAt: string | null;
  error: string | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number | null;
};

export type SocialPost = {
  id: string;
  topic: string;
  request: string | null;
  caption: string;
  hashtags: string[];
  status: PostStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  createdAt: string;
  createdBy: { name: string } | null;
  media: PostMedia | null;
  targets: PostTarget[];
};

export type PostMedia = { id: string; source: "AI" | "UPLOAD"; prompt: string | null };

export function mediaUrl(id: string) {
  return `/api/clinic/social/media/${id}`;
}

export type SocialAccount = { platform: Platform; handle: string; live: boolean; connectedAt: string | null; lastError: string | null };

export function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Sum of a metric across platforms; null (shown as "—") when no platform has reported it. */
export function sumMetric(post: SocialPost, key: "impressions" | "likes" | "comments" | "shares") {
  const values = post.targets.map((t) => t[key]).filter((v): v is number => typeof v === "number");
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}
