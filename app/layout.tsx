import type { Metadata, Viewport } from "next";
import { Manrope, Outfit, Poppins } from "next/font/google";
import "./globals.css";
import AnalyticsProvider from "@/components/AnalyticsProvider";

// All three faces are SIL Open Font License and self-hosted by next/font (no
// runtime request to Google). Outfit carries display headings; Poppins carries
// body copy and navigation; Manrope carries UI chrome (buttons, eyebrows,
// labels, metadata, tables). Weights are the minimum the design system uses.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

// 400 for paragraphs and descriptions, 500 for navigation — nothing heavier is
// loaded, so copy never renders a synthesised bold. next/font also emits a
// metrics-matched "Poppins Fallback" face, which keeps the swap shift minimal.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const SITE_URL = "https://smileaimarketing.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Smile AI Marketing | Digital Marketing for Canadian Dental Practices",
    template: "%s | Smile AI Marketing",
  },
  description:
    "Smile AI Marketing helps Canadian dental practices get found in local search, attract more qualified patient enquiries, and turn their websites into a dependable source of new patients. Start with a free website audit.",
  keywords: [
    "dental marketing",
    "dental marketing agency",
    "marketing for dentists",
    "local SEO for dentists",
    "dental SEO services",
    "dental website design",
    "dental patient acquisition",
  ],
  authors: [{ name: "Smile AI Marketing" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Smile AI Marketing",
    title: "Smile AI Marketing | Digital Marketing for Canadian Dental Practices",
    description:
      "Local search visibility, qualified patient enquiries and better websites for Canadian dental clinics. Start with a free website audit.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Smile AI Marketing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smile AI Marketing | Digital Marketing for Canadian Dental Practices",
    description:
      "Local search visibility, qualified patient enquiries and better websites for Canadian dental clinics.",
    images: ["/opengraph-image"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${outfit.variable} ${poppins.variable}`}
    >
      {/* suppressHydrationWarning: browser extensions (Grammarly etc.) inject attributes on <body>
          before React hydrates, which otherwise logs a hydration-mismatch error on every page. */}
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased" suppressHydrationWarning>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
