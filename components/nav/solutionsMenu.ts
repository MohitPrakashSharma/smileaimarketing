import { SERVICES, type Service } from "@/lib/services";

/**
 * Content for the Solutions mega menu.
 *
 * Every entry points at a page that exists, and the service lines reuse each
 * service's own `short` text rather than a second description written for the
 * menu — one source, so the menu cannot drift from the page it links to.
 */

export type MenuEntry = { title: string; detail: string; href: string };
export type MenuGroup = { heading: string; entries: MenuEntry[] };
export type MenuTab = { id: string; label: string; blurb: string; groups: MenuGroup[] };

const bySlug = new Map(SERVICES.map((s) => [s.slug, s]));

function service(slug: string): MenuEntry {
  const s: Service | undefined = bySlug.get(slug);
  if (!s) throw new Error(`Solutions menu references a missing service: ${slug}`);
  return { title: s.title, detail: s.short, href: `/services/${s.slug}` };
}

export const SOLUTIONS_TABS: MenuTab[] = [
  {
    id: "service",
    label: "By service",
    blurb: "What we do, grouped by the part of the problem it solves.",
    groups: [
      {
        heading: "Getting found",
        entries: [service("local-seo-for-dentists"), service("on-page-seo"), service("off-page-seo")],
      },
      {
        heading: "Your website",
        entries: [
          service("dental-website-design-development"),
          service("technical-seo-pagespeed"),
          service("conversion-rate-optimization"),
        ],
      },
      {
        heading: "Content and planning",
        entries: [service("dental-content-marketing"), service("seo-audit-strategy")],
      },
    ],
  },
  {
    id: "start",
    label: "Where to start",
    blurb: "Three ways in, depending on how much you already know.",
    groups: [
      {
        heading: "See where you stand",
        entries: [
          {
            title: "Free website audit",
            detail: "Runs on your public site and listings. No logins, no account access.",
            href: "/free-dental-audit",
          },
          {
            title: "What the audit checks",
            detail: "Crawl, technical checks, Google's PageSpeed data and the path to booking.",
            href: "/about",
          },
        ],
      },
      {
        heading: "Talk it through",
        entries: [
          {
            title: "Book a consultation",
            detail: "Bring your practice and the problem; we will say what we would do first.",
            href: "/book-consultation",
          },
          {
            title: "How it works",
            detail: "The four steps from audit to the fixes we recommend.",
            href: "/how-it-works",
          },
        ],
      },
      {
        heading: "Browse first",
        entries: [
          { title: "All services", detail: "The full list, with what each one includes.", href: "/services" },
          { title: "Case studies", detail: "Work we have done and what changed because of it.", href: "/case-studies" },
        ],
      },
    ],
  },
  {
    id: "why",
    label: "Why Smile AI?",
    blurb: "How we work, and what we will not claim.",
    groups: [
      {
        heading: "How we work",
        entries: [
          { title: "About us", detail: "Dental practices only, and evidence before assumptions.", href: "/about" },
          {
            title: "Our approach",
            detail: "Measure first, fix what blocks patients, then build on it.",
            href: "/about",
          },
        ],
      },
      {
        heading: "What you get",
        entries: [
          {
            title: "Evidence you can check",
            detail: "Every recommendation traced to something measured on your site.",
            href: "/about",
          },
          { title: "Questions we are asked", detail: "Straight answers on scope, timing and cost.", href: "/#faq" },
        ],
      },
      {
        heading: "Built for Canada",
        entries: [
          {
            title: "Canadian dental practices",
            detail: "Brampton and the Greater Toronto Area, working across Canada.",
            href: "/about",
          },
          { title: "Privacy", detail: "What we collect during an audit, and what we do not.", href: "/privacy" },
        ],
      },
    ],
  },
];
