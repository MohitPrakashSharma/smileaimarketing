export type Service = {
  slug: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  subhead: string;
  whatWeCheck: { title: string; detail: string }[];
  commonProblems: { title: string; detail: string }[];
  faqs: { q: string; a: string }[];
};

/**
 * Service pages are hand-authored, typed content — same pattern as
 * lib/caseStudies.ts. Each page stays scoped to its own content pillar
 * (see docs/2026-content-strategy.md) rather than repeating what a sibling
 * service page already covers.
 */
export const SERVICES: Service[] = [
  {
    slug: "local-seo-for-dentists",
    title: "Local SEO for Dentists",
    seoTitle: "Local SEO for Dentists",
    metaDescription:
      "See exactly where your dental practice stands in local search — Google Maps ranking, citation consistency, and competitor visibility — checked publicly, no guaranteed rankings.",
    eyebrow: "LOCAL SEO FOR DENTISTS",
    h1: "Show up when nearby patients search for a dentist.",
    subhead:
      "We check your Google Maps ranking, business listing consistency, and how you compare to nearby practices — then show you exactly what's holding your visibility back. No guesses, and no promises about where you'll rank.",
    whatWeCheck: [
      {
        title: "Google Maps & local pack position",
        detail: "Where your practice actually appears for local dental searches, not just whether you're listed.",
      },
      {
        title: "Business listing consistency",
        detail: "Whether your name, address, and phone number match across the places patients and Google check.",
      },
      {
        title: "Review position",
        detail: "How your review count and rating compare to the practices currently outranking you.",
      },
      {
        title: "Competitor visibility gap",
        detail: "Which nearby practices are capturing map-pack traffic, and roughly how far ahead they are.",
      },
    ],
    commonProblems: [
      {
        title: "Missing from the map pack",
        detail: "Your practice doesn't appear in the top local results for the searches that matter most.",
      },
      {
        title: "Inconsistent listing details",
        detail: "Mismatched name, address, or phone details across directories can quietly work against your ranking.",
      },
      {
        title: "Thinner review signals than nearby competitors",
        detail: "Fewer or older reviews than the practices currently ahead of you in local results.",
      },
    ],
    faqs: [
      {
        q: "Can you guarantee a #1 Google ranking?",
        a: "No — and any agency that promises this isn't being straight with you. Local rankings depend on factors outside any agency's control, including Google's own algorithm changes. What we do instead is show you exactly where you stand today and what's realistic to improve.",
      },
      {
        q: "Do you need access to my Google Business Profile to check this?",
        a: "No. The initial audit is based on public search and map results — the same thing a prospective patient would see. We don't need any login access to run it.",
      },
      {
        q: "How is my current ranking actually measured?",
        a: "We check your live position in Google's local results for your practice's core search terms and city, alongside publicly visible listing and review data — not a black-box score.",
      },
      {
        q: "How long does a local SEO audit take?",
        a: "The initial scan runs in under a minute. Once you unlock the full report, you get the complete visibility and competitor breakdown right away.",
      },
    ],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
