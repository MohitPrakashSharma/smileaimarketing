import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import GalleryStrip from "@/components/GalleryStrip";
import ServicesGrid from "@/components/ServicesGrid";
import ReportingDashboard from "@/components/ReportingDashboard";
import FAQ, { FAQS } from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Smile AI Marketing",
  description:
    "Marketing agency helping dental clinics improve local visibility, generate qualified patient enquiries, and book more appointments.",
  url: "https://smileaimarketing.com",
  email: "hello@smileaimarketing.com",
  areaServed: "US",
  knowsAbout: [
    "Dental marketing",
    "Local SEO",
    "Google Business Profile optimization",
    "Dental website design",
    "Patient lead generation",
    "Reputation management",
  ],
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <GalleryStrip />
        <ServicesGrid />
        <ReportingDashboard />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
