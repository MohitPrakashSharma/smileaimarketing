/** Client-safe platform metadata shared by the agent, API and UI. */

export const PLATFORMS = ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  LINKEDIN: "LinkedIn",
};

/** What each platform will need beyond text once live publishing is switched on. */
export const PLATFORM_MEDIA_NOTE: Partial<Record<Platform, string>> = {
  INSTAGRAM: "Instagram posts need an image.",
  TIKTOK: "Live TikTok posts will need a video — the image is used in test mode.",
};

export function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (PLATFORMS as readonly string[]).includes(value);
}
