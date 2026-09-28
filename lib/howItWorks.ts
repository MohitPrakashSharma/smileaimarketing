/**
 * The four steps of the audit, and what each one involves.
 *
 * Shared by the homepage teaser and the dedicated /how-it-works page so the
 * process is described once. Every line here restates something the product
 * actually does — the timings come from the FAQ, the checks from what the
 * audit pipeline runs, and nothing promises an outcome we do not control.
 */

export type HowItWorksStep = {
  title: string;
  /** One line, used on the homepage cards. */
  detail: string;
  /** What actually happens, for the dedicated page. */
  expanded: string;
  /** Concrete points — no more than four, each checkable. */
  points: string[];
  /** Plain statement of what this step costs the reader in time or access. */
  note: string;
  image: string;
  alt: string;
};

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Enter your website and city",
    detail: "That's all we need. No passwords, no Google account access, nothing to install.",
    expanded:
      "You give us the practice website and the city you are in. Nothing else. We only look at what a prospective patient can already see when they search for a dentist nearby, so there is no login to hand over and nothing to install.",
    points: [
      "No access to your Google Business Profile",
      "No access to your website or hosting",
      "Nothing installed on your site",
      "A first preview appears within seconds",
    ],
    note: "Takes about a minute.",
    image: "/images/step-enter-website.jpg",
    alt: "A receptionist in scrubs reading a tablet at a clinic front desk",
  },
  {
    title: "We review how patients find you",
    detail: "Local search visibility, nearby competitors, reviews, and your website and booking experience.",
    expanded:
      "We crawl the site and read it the way a search engine does, run the technical checks, pull Google's own PageSpeed results for mobile and desktop, and follow the path a patient takes from landing on a page to getting in touch.",
    points: [
      "Your pages — titles, headings, content, links and images",
      "Technical checks: indexability, redirects, structured data, security",
      "Google PageSpeed Insights on mobile and desktop",
      "How quickly a visitor reaches your phone number or a booking",
    ],
    note: "Runs on its own — nothing for you to do.",
    image: "/images/step-patient-search.jpg",
    alt: "A person holding a smartphone and searching a map for a nearby location",
  },
  {
    title: "Get your Practice Growth Review",
    detail: "A plain-English report: what's working, where the opportunities are, and what to fix first.",
    expanded:
      "The full report is usually ready in about two minutes and is sent to your email, so you can read it when it suits you and come back to it later. It is written to be read by the person who runs the practice, not by a developer.",
    points: [
      "Scores for local visibility, reviews, website experience and booking",
      "Findings that say what each issue means for patient enquiries",
      "A prioritised view of what to address first",
      "Yours to keep and act on, with or without us",
    ],
    note: "Usually ready in about two minutes.",
    image: "/images/step-growth-review.jpg",
    alt: "A dentist seated in a treatment room reading a printed report",
  },
  {
    title: "Review the findings together",
    detail: "Book a 15-minute call or an in-person visit and we'll walk through it. No pitch, no obligation.",
    expanded:
      "If you want a second pair of eyes, book a short call or an in-person visit and we will go through the report with you — what it found, what we would do first, and what we would leave alone. If you would rather take it away and act on it yourself, that is a perfectly good outcome.",
    points: [
      "A 15-minute call, or a visit if you are nearby",
      "We explain the findings, not a package",
      "You decide what, if anything, happens next",
    ],
    note: "Optional, and free.",
    image: "/images/step-review-findings.jpg",
    alt: "A dentist and a patient reviewing images together on a screen",
  },
];
