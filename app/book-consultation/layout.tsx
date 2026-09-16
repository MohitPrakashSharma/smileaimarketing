import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Book a free 15-minute consultation with Smile AI Marketing to walk through your dental practice's audit findings and agree on what's worth fixing first.",
  alternates: { canonical: "/book-consultation" },
};

export default function BookConsultationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
