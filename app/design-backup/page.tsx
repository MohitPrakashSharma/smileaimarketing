import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FinalCTA from "@/components/FinalCTA";
import SampleAuditPreview from "@/components/SampleAuditPreview";
import TrustAndConsultation from "@/components/TrustAndConsultation";

/**
 * Parking page for sections retired from the homepage, kept rendering so
 * they can be brought back or reused later. Not linked from the site and
 * excluded from search indexes.
 */
export const metadata: Metadata = {
  title: "Design backup — retired homepage sections",
  robots: { index: false, follow: false },
};

const PARKED = [
  { name: "Get started CTA band", component: "components/FinalCTA.tsx", retired: "Removed from the homepage on 2026-09-21 (repeated the audit/consultation invitations)." },
  { name: "Trust & consultation (\"Talk it through with our team\")", component: "components/TrustAndConsultation.tsx", retired: "Removed from the homepage on 2026-09-21." },
  { name: "Sample audit report preview", component: "components/SampleAuditPreview.tsx", retired: "Removed from the homepage on 2026-09-18." },
];

export default function DesignBackupPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-border-subtle bg-background-alt">
          <div className="container-site py-10">
            <p className="text-eyebrow text-primary-ink">Design backup</p>
            <h1 className="mt-3 text-heading-2 text-foreground">Retired homepage sections</h1>
            <p className="mt-3 max-w-2xl text-body text-muted-foreground">
              These sections are no longer on the homepage but are kept here, fully working, in case we want them back. This page is not indexed or linked.
            </p>
            <ul className="mt-5 space-y-1.5 text-body-small text-muted-foreground">
              {PARKED.map((p) => (
                <li key={p.name}>
                  <span className="font-medium text-foreground">{p.name}</span> — <code className="text-metadata">{p.component}</code>. {p.retired}
                </li>
              ))}
            </ul>
          </div>
        </section>
        <FinalCTA />
        <TrustAndConsultation />
        <SampleAuditPreview />
      </main>
      <Footer />
    </>
  );
}
