import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book a Consultation",
  description:
    "Book a free 15-minute online review with Smile AI Marketing to walk through your practice's growth audit and what's worth fixing first.",
  alternates: { canonical: "/book-consultation" },
};

export default function BookConsultationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
