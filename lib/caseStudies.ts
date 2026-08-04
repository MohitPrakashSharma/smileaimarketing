export type CaseStudyMetric = {
  label: string;
  before: string;
  after: string;
};

export type CaseStudyAction = {
  category: string;
  description: string;
};

export type CaseStudy = {
  slug: string;
  type: "internal-build" | "client";
  title: string;
  seoTitle: string;
  metaDescription: string;
  summary: string;
  subject: string;
  publishedAt: string;
  problem: string;
  metrics: CaseStudyMetric[];
  actions: CaseStudyAction[];
  evidence: string[];
  limitations: string;
  nextSteps: string;
};

/**
 * Case studies are hand-authored, typed content — not a database-backed CMS.
 * A single internal engineering case study doesn't warrant the full
 * permission/evidence review workflow designed in docs/case-study-system.md;
 * that model is for future client case studies, where permission and
 * verified third-party evidence genuinely need an approval gate. This file
 * is the source of truth until that's needed.
 */
export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "rebuilding-our-own-platform",
    type: "internal-build",
    title: "How We Rebuilt Smile AI Marketing's Own Platform",
    seoTitle: "A Transparent Build Case Study",
    metaDescription:
      "An honest, verifiable look at how we redesigned our own landing page, audit intake flow, and admin dashboard — with real before/after numbers, not client results.",
    summary:
      "Before we ask a dental practice to trust our audits, we applied the same standard to our own platform: less text, clearer structure, and forms and navigation that actually hold up on mobile. This case study covers what changed and how each claim was verified — no patient or revenue figures, because this is our own build, not a client outcome.",
    subject: "Smile AI Marketing's own platform",
    publishedAt: "2026-08-04",
    problem:
      "The platform's landing page had grown to 11 overlapping content blocks with duplicated calls to action. The audit intake flow mixed a loading state and a contact-detail gate into a single ambiguous step. The admin dashboard was built around a permanent sidebar with no overview page — there was nowhere to land and see what needed attention. Forms across the app mixed two incompatible design-token systems, and a number of interactive controls fell below a comfortable mobile touch-target size.",
    metrics: [
      { label: "Landing page content blocks", before: "11", after: "7" },
      {
        label: "Primary CTA label variants in use",
        before: '4 ("Analyse My Practice", "Run This Audit for My Clinic", "Get Your Free Growth Plan", "Get Free Consultation")',
        after: '1 ("Audit My Practice")',
      },
      {
        label: "Admin navigation",
        before: "Permanent sidebar, no overview/landing page",
        after: "Top nav (desktop) + bottom nav (mobile) command-centre, with a 6-card work-queue Overview page",
      },
      { label: "Shared form primitives in use", before: "0", after: "6, applied to every form in the app" },
      { label: "Interactive controls below a 44px touch target", before: "Present (e.g. 36–40px buttons)", after: "0 — standardized to ≥44px" },
      {
        label: "Pre-existing ESLint problems",
        before: "46 (37 errors, 9 warnings)",
        after: "4 errors, 2 warnings — all confirmed pre-existing, zero new introduced",
      },
    ],
    actions: [
      {
        category: "Landing page",
        description:
          "Reduced to 7 sections (hero, sample audit, key problems, process, trust & consultation, FAQ, final CTA) and consolidated every call to action to one consistent label.",
      },
      {
        category: "Audit intake flow",
        description:
          "Rebuilt as an explicit 4-step wizard — practice details, processing, preview, contact — with a visible progress indicator, replacing a 2-step flow that conflated loading and contact-gating.",
      },
      {
        category: "Admin dashboard",
        description:
          "Removed the permanent sidebar. Replaced it with a top/bottom-nav command-centre and a new Overview page surfacing real work queues (audits ready for review, hot leads, follow-ups due, meetings, recent activity).",
      },
      {
        category: "Forms & accessibility",
        description:
          "Introduced shared Button/Input/Textarea/Select/FormField/ProgressSteps primitives, standardized every touch target to at least 44px, and migrated legacy design tokens onto one semantic system.",
      },
      {
        category: "Code health",
        description:
          "Resolved the large majority of pre-existing ESLint errors as a byproduct of the rewrite, with zero new errors introduced, and verified a clean production build after each phase of work.",
      },
    ],
    evidence: [
      "This repository's own commit history (commit c069479, 45 files changed, +2595/-2091 lines)",
      "Direct ESLint output comparison against a git-stashed pre-redesign baseline",
      "A manual responsive-class code audit across 320–430px breakpoints",
      "Production build output (next build) confirming zero new errors across two build phases",
    ],
    limitations:
      "This is an internal engineering case study describing our own platform — not a client outcome. It does not include patient-enquiry, booking, or revenue figures, because analytics tracking was not yet implemented at the time of this build. It should not be read as a guarantee of results for any dental practice client; real client outcomes depend on that practice's own market, competition, and starting position.",
    nextSteps:
      "Wire the analytics event pipeline so the redesigned funnel can be measured directly, extend the same design system to any remaining legacy-styled pages, and publish verified client case studies once real campaigns and audits are running on real data.",
  },
];

export function getCaseStudyBySlug(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug);
}
