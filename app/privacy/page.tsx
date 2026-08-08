import type { Metadata } from "next";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[1200px] justify-between px-6 py-6 sm:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          Smile AI<span className="text-primary">.</span>
        </Link>
      </header>

      <main className="mx-auto max-w-[800px] flex-1 space-y-8 px-6 py-12 sm:px-8 sm:py-16">
        <div>
          <Eyebrow>Platform Guidelines</Eyebrow>
          <h1 className="mt-4 text-heading-1 font-semibold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-body-small text-muted-foreground">Last updated: August 4, 2026</p>
        </div>

        <div className="space-y-6 text-body-small leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-heading-3 font-bold text-foreground">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect practice information (website URL, city, and clinic name) when you request a diagnostic audit. To unlock the full report, we collect professional contact details (first name, last name, business email, practice role, and phone number). We do not collect patient files or protected health information (PHI).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-heading-3 font-bold text-foreground">2. How We Use Information</h2>
            <p className="text-muted-foreground">
              We use the collected details to evaluate your local maps ranking and website responsiveness, compile comparative diagnostic scorecards, communicate recommendations, and coordinate scheduled strategy calls.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-heading-3 font-bold text-foreground">3. Compliance &amp; Opt-Out</h2>
            <p className="text-muted-foreground">
              All marketing communications include a simple unsubscribe mechanism. Opting out via our{" "}
              <Link href="/unsubscribe" className="font-semibold text-primary underline underline-offset-4">
                unsubscribe form
              </Link>{" "}
              permanently adds your email and business domain to our suppression list and cancels all active outreach.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-heading-3 font-bold text-foreground">4. Data Security</h2>
            <p className="text-muted-foreground">
              We enforce role-based authentication, use non-sequential cryptographic tokens for public report links, and apply rate-limiting to prevent database extraction or abuse.
            </p>
          </section>
        </div>
      </main>

      <footer className="mt-12 border-t border-border py-6 text-center text-metadata text-muted-foreground">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
