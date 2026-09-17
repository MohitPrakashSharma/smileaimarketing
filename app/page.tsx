import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AuditSection from "@/components/AuditSection";
import ServicesOverview from "@/components/ServicesOverview";
import PatientJourney from "@/components/PatientJourney";
import SampleAuditPreview from "@/components/SampleAuditPreview";
import HowItWorks from "@/components/HowItWorks";
import TrustAndConsultation from "@/components/TrustAndConsultation";
import FAQ from "@/components/FAQ";
import { FAQS } from "@/components/faqData";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Smile AI Marketing",
  description:
    "Digital marketing agency for Canadian dental practices — local search visibility, qualified patient enquiries, and websites that help practices grow.",
  url: "https://smileaimarketing.com",
  email: "hello@smileaimarketing.com",
  areaServed: "CA",
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
        <AuditSection />
        <ServicesOverview />
        <PatientJourney />
        <SampleAuditPreview />
        <HowItWorks />
        <TrustAndConsultation />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
