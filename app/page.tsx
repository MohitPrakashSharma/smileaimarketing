import Header from "@/components/Header";
import Hero from "@/components/Hero";
import TrustStrip from "@/components/TrustStrip";
import ProblemSection from "@/components/ProblemSection";
import ProcessFlow from "@/components/ProcessFlow";
import ServicesGrid from "@/components/ServicesGrid";
import WhyAI from "@/components/WhyAI";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Smile AI Marketing",
  description:
    "Marketing agency helping dental clinics grow local visibility, patient enquiries, and appointments.",
  url: "https://smileaimarketing.com",
  email: "hello@smileaimarketing.com",
  areaServed: "US",
  knowsAbout: [
    "Dental marketing",
    "Local SEO",
    "Google Business Profile optimization",
    "Dental website design",
    "Google Ads",
    "Reputation management",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
      />
      <Header />
      <main className="flex-1">
        <Hero />
        <TrustStrip />
        <ProblemSection />
        <ProcessFlow />
        <ServicesGrid />
        <WhyAI />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
