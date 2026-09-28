/**
 * Launch-market configuration for marketing copy — not per-lead data.
 * Change these when expanding the primary launch city to a new Canadian market.
 */
export const TARGET_CITY = "Toronto";
export const TARGET_PROVINCE = "Ontario";
export const TARGET_COUNTRY = "Canada";
/**
 * How we describe where we work from in body copy. The practice address in
 * `CONTACT` is in Brampton, so copy says the region rather than naming Toronto
 * as the base — the two would otherwise contradict each other on the page.
 */
export const TARGET_REGION = "Brampton and the Greater Toronto Area";

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

/**
 * How a practice reaches us. One source for the footer, the audit report and
 * the PDFs, so a change here reaches every surface.
 */
export const CONTACT = {
  email: "hello@smileaimarketing.com",
  phone: { display: "+1 437-971-4014", href: "tel:+14379714014" },
  address: ["98 Personna Cir", "Brampton, ON L6X 0P2, Canada"],
};
