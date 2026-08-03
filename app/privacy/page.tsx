import Eyebrow from "@/components/Eyebrow";

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink selection:bg-teal selection:text-white">
      <header className="mx-auto flex w-full max-w-[1200px] justify-between px-6 py-6 sm:px-8">
        <a href="/" className="font-display text-xl font-bold tracking-tight text-ink">
          Smile AI<span className="text-teal">.</span>
        </a>
      </header>

      <main className="flex-1 max-w-[800px] mx-auto px-6 py-12 sm:py-16 space-y-8 font-body">
        <div>
          <Eyebrow>Platform Guidelines</Eyebrow>
          <h1 className="mt-4 font-display text-3xl sm:text-4xl font-semibold">Privacy Policy</h1>
          <p className="mt-2 text-xs text-slate">Last updated: August 4, 2026</p>
        </div>

        <div className="prose prose-slate text-sm leading-relaxed space-y-6">
          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-ink-2">1. Information We Collect</h2>
            <p className="text-slate">
              We collect clinical information (website URL, city, and clinic name) when you request a diagnostic audit. To unlock the full audit report, we collect professional contact details (first name, last name, business email, practice role, and phone number). We do not collect individual patient files or private health records (PHI).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-ink-2">2. How We Use Information</h2>
            <p className="text-slate">
              We use the collected details to evaluate your local maps ranking and website responsiveness, compile comparative diagnostic marketing scorecards, communicate recommendations, and coordinate scheduled strategy calls.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-ink-2">3. Compliance & Opt-Out</h2>
            <p className="text-slate">
              All marketing communications and automated campaigns include explicit, simple unsubscribe mechanisms. When you opt-out via our unsubscribe form, your email and business domain are permanently added to our suppression database, cancelling all active background jobs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-display text-lg font-bold text-ink-2">4. Data Security</h2>
            <p className="text-slate">
              We enforce role-based authentication, use random, non-sequential cryptographic UUIDs for public report routes, and apply rate-limiting to prevent database extraction or billing abuse.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-6 text-center font-body text-[13px] text-slate border-t border-line mt-12">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
