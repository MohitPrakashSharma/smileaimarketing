"use client";

import FocusCarousel, { type FocusSlide } from "@/components/FocusCarousel";
import { IconMapPin, IconMonitor, IconSearch, IconTrendingUp } from "@/components/icons";

/**
 * The four areas an audit looks at, as an interactive card scroll.
 *
 * The slide data lives in this client component rather than in the page:
 * each slide carries an icon *component*, and React cannot pass a function
 * across the server/client boundary as a prop.
 */

const FOCUS_AREAS: FocusSlide[] = [
  {
    Icon: IconMapPin,
    title: "Local Visibility",
    detail: "Help practices improve how they appear across search and local discovery, where most patients start looking.",
    image: "/images/step-patient-search.jpg",
    alt: "A person searching on a smartphone",
  },
  {
    Icon: IconMonitor,
    title: "Website Experience",
    detail: "Make it easier for potential patients to understand your services and take the next step — call, book or ask a question.",
    image: "/images/focus-consultation.jpg",
    alt: "A dentist talking with a patient in a dental chair",
  },
  {
    Icon: IconSearch,
    title: "SEO & Content",
    detail: "Improve page structure, relevance and visibility without keyword stuffing or content written for robots.",
    image: "/images/focus-imaging.jpg",
    alt: "Two dental professionals reviewing images on a computer screen",
  },
  {
    Icon: IconTrendingUp,
    title: "Performance & Insights",
    detail: "Use website audits, PageSpeed data and evidence to identify what should be fixed first.",
    image: "/images/step-review-findings.jpg",
    alt: "Two people reviewing results on a monitor",
  },
];

export default function FocusAreas() {
  return (
    <FocusCarousel
      slides={FOCUS_AREAS}
      eyebrow="What we focus on"
      heading="Four things that decide whether a patient finds you and books."
    />
  );
}
