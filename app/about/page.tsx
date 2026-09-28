import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AboutContent from "@/components/about/AboutContent";
import { aboutPageJsonLd, breadcrumbJsonLd, jsonLdProps } from "@/lib/structuredData";

const SITE_URL = "https://smileaimarketing.com";
const TITLE = "About Smile AI Marketing | Dental Marketing for Canadian Practices";
const DESCRIPTION =
  "Smile AI Marketing helps Canadian dental practices improve how they are found, understood and chosen online — website strategy, local search visibility and evidence-based recommendations.";

export const metadata: Metadata = {
  // Absolute: the requested title already carries the brand, so the root
  // "%s | Smile AI Marketing" template must not append it a second time.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/about`,
    siteName: "Smile AI Marketing",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Smile AI Marketing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function AboutPage() {
  return (
    <>
      {/* Organisation markup comes from the root layout; these two describe the page itself. */}
      <script {...jsonLdProps(aboutPageJsonLd({ name: TITLE, description: DESCRIPTION }))} />
      <script {...jsonLdProps(breadcrumbJsonLd([{ name: "About", path: "/about" }]))} />
      <Header />
      {/* No closing CTA band: the Canadian focus section at the end of
          AboutContent carries the calls to action instead. */}
      <AboutContent />
      <Footer />
    </>
  );
}
