import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Dental Website Audit",
  description:
    "A free, plain-English audit of your dental practice's local search visibility, website, reviews and booking journey. See what to fix first in about two minutes — no logins required.",
  alternates: { canonical: "/free-dental-audit" },
};

export default function FreeDentalAuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
