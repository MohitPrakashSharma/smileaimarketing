/**
 * Launch-market configuration for marketing copy — not per-lead data.
 * Change these when expanding the primary launch city to a new Canadian market.
 */
export const TARGET_CITY = "Toronto";
export const TARGET_PROVINCE = "Ontario";
export const TARGET_COUNTRY = "Canada";

/**
 * Social profiles shown in the footer. Fill in the real profile URLs; while an
 * `href` is empty the icon still renders but is not a link.
 */
export const SOCIAL_LINKS: { key: "instagram" | "facebook" | "linkedin" | "google"; label: string; href: string }[] = [
  { key: "instagram", label: "Instagram", href: "" },
  { key: "facebook", label: "Facebook", href: "" },
  { key: "linkedin", label: "LinkedIn", href: "" },
  { key: "google", label: "Google Business Profile", href: "" },
];
