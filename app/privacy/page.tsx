import type { Metadata } from "next";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import MinimalShell from "@/components/MinimalShell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <MinimalShell align="top">
      <div className="container-narrow flex-1 space-y-10 py-6 sm:py-10">
        <div>
          <Eyebrow>Platform Guidelines</Eyebrow>
          <h1 className="mt-5 text-heading-1 text-foreground">Privacy Policy</h1>
          <p className="mt-3 text-metadata">Last updated: August 4, 2026</p>
        </div>

        <div className="space-y-8 text-body">
          <section className="space-y-3">
            <h2 className="text-heading-3 text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect practice information (website URL, city, and clinic name) when you request a diagnostic audit. To unlock the full report, we collect professional contact details (first name, last name, business email, practice role, and phone number). We do not collect patient files or protected health information (PHI).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-heading-3 text-foreground">2. How We Use Information</h2>
            <p className="text-muted-foreground">
              We use the collected details to evaluate your local maps ranking and website responsiveness, compile comparative diagnostic scorecards, communicate recommendations, and coordinate scheduled strategy calls.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-heading-3 text-foreground">3. Compliance &amp; Opt-Out</h2>
            <p className="text-muted-foreground">
              All marketing communications include a simple unsubscribe mechanism. Opting out via our{" "}
              <Link href="/unsubscribe" className="font-semibold text-primary-ink underline decoration-1 underline-offset-4 hover:decoration-2">
                unsubscribe form
              </Link>{" "}
              permanently adds your email and business domain to our suppression list and cancels all active outreach.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-heading-3 text-foreground">4. Data Security</h2>
            <p className="text-muted-foreground">
              We enforce role-based authentication, use non-sequential cryptographic tokens for public report links, and apply rate-limiting to prevent database extraction or abuse.
            </p>
          </section>
        </div>
      </div>
    </MinimalShell>
  );
}
