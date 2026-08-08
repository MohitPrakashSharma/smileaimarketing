import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Dental Practice Audit",
  description:
    "Get a free, plain-English audit of your dental practice's Google visibility, website, reviews, and booking journey — see what's costing you new patients in under 2 minutes.",
  alternates: { canonical: "/free-dental-audit" },
};

export default function FreeDentalAuditLayout({ children }: { children: React.ReactNode }) {
  return children;
}
