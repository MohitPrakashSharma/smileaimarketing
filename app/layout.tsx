import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_URL = "https://smileaimarketing.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Smile AI Marketing | Dental Marketing Agency for Local Growth",
    template: "%s | Smile AI Marketing",
  },
  description:
    "Smile AI Marketing helps dental clinics win more local visibility, turn searches into enquiries, and convert enquiries into booked patients — with AI-assisted execution and a plain-English process.",
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
    title: "Smile AI Marketing | Dental Marketing Agency for Local Growth",
    description:
      "Local visibility, more enquiries, and more booked patients for dental clinics — explained in plain English, run with AI-assisted execution.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Smile AI Marketing" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smile AI Marketing | Dental Marketing Agency for Local Growth",
    description:
      "Local visibility, more enquiries, and more booked patients for dental clinics.",
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
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
