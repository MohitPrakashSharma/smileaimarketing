import { CONTACT } from "@/lib/siteConfig";

/**
 * Schema.org JSON-LD shared across the site.
 *
 * The Organization block is rendered once, in the root layout, so every page
 * carries it and no page repeats it. Page-specific blocks (AboutPage,
 * BreadcrumbList, Service, FAQPage …) are built here and rendered by the page
 * that owns them.
 *
 * Everything here restates facts already published on the site — the address,
 * phone and email come from `CONTACT` so a change reaches the footer, the
 * reports and this markup together.
 */

export const SITE_URL = "https://smileaimarketing.com";
const [STREET_ADDRESS] = CONTACT.address;

/** E.164-ish form schema.org expects, derived from the dialable href. */
const TELEPHONE = CONTACT.phone.href.replace("tel:", "").replace(/(\+1)(\d{3})(\d{3})(\d{4})/, "$1-$2-$3-$4");

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": ORGANIZATION_ID,
  name: "Smile AI Marketing",
  description:
    "Digital marketing agency for Canadian dental practices — local search visibility, qualified patient enquiries, and websites that help practices grow.",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  image: `${SITE_URL}/opengraph-image`,
  email: CONTACT.email,
  telephone: TELEPHONE,
  address: {
    "@type": "PostalAddress",
    streetAddress: STREET_ADDRESS,
    addressLocality: "Brampton",
    addressRegion: "ON",
    postalCode: "L6X 0P2",
    addressCountry: "CA",
  },
  areaServed: { "@type": "Country", name: "Canada" },
  knowsAbout: [
    "Dental marketing",
    "Local SEO",
    "Google Business Profile optimization",
    "Dental website design",
    "Patient lead generation",
    "Reputation management",
  ],
};

/** Home → … trail. Pass the pages after Home, in order. */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function aboutPageJsonLd({ name, description }: { name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE_URL}/about#webpage`,
    url: `${SITE_URL}/about`,
    name,
    description,
    isPartOf: { "@type": "WebSite", url: SITE_URL, name: "Smile AI Marketing" },
    // The page is about the agency described once in the root layout.
    about: { "@id": ORGANIZATION_ID },
    primaryImageOfPage: `${SITE_URL}/images/about-hero.jpg`,
  };
}

/** Single place that renders a block, so the serialisation is identical everywhere. */
export function jsonLdProps(schema: object) {
  return { type: "application/ld+json", dangerouslySetInnerHTML: { __html: JSON.stringify(schema) } } as const;
}
