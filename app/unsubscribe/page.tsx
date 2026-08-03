"use client";

import { useState } from "react";
import Eyebrow from "@/components/Eyebrow";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to unsubscribe");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink selection:bg-teal selection:text-white">
      <header className="mx-auto flex w-full max-w-[1200px] justify-between px-6 py-6 sm:px-8">
        <a href="/" className="font-display text-xl font-bold tracking-tight text-ink">
          Smile AI<span className="text-teal">.</span>
        </a>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-[0_20px_50px_-20px_rgba(8,44,58,0.12)]">
          <div className="text-center space-y-4">
            <Eyebrow>Outreach Compliance</Eyebrow>
            <h1 className="font-display text-2xl font-semibold">Unsubscribe</h1>
            <p className="font-body text-xs text-slate">
              Please enter your professional email address below to suppress your email and domain from all future outreach campaigns.
            </p>
          </div>

          {submitted ? (
            <div className="mt-8 rounded-2xl bg-teal/10 border border-teal/20 p-6 text-center">
              <p className="font-body text-sm font-semibold text-teal-deep">Unsubscribed Successfully</p>
              <p className="mt-2 font-body text-xs text-slate">
                Your email ({email}) and associated clinic domain have been placed on our suppression list.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="mt-8 space-y-4">
              {error && (
                <div className="rounded-xl bg-coral/10 border border-coral/20 p-4 text-center text-sm font-semibold text-coral">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email-address" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Email Address
                </label>
                <input
                  id="email-address"
                  type="email"
                  required
                  placeholder="e.g. owner@clinicwebsite.com"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-coral py-4 font-body text-sm font-bold text-white shadow-[0_12px_28px_-10px_rgba(255,107,97,0.4)] transition-colors hover:bg-red-600 disabled:bg-line disabled:text-slate"
              >
                {loading ? "Processing..." : "Confirm Opt-out"}
              </button>
            </form>
          )}
        </div>
      </main>

      <footer className="py-6 text-center font-body text-[13px] text-slate border-t border-line">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
