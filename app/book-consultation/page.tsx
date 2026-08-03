"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";

export default function BookConsultationPage() {
  const [clinicName, setClinicName] = useState("");
  const [website, setWebsite] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Step 1: Create the business and contact in a single trigger-like mock structure
      // For a direct inbound booking, we trigger the audit analysis as well
      let formattedUrl = website;
      if (!website.startsWith("http://") && !website.startsWith("https://")) {
        formattedUrl = `https://${website}`;
      }

      const triggerRes = await fetch("/api/audit/inbound-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: formattedUrl,
          city: "Inbound Search",
          clinicName: clinicName || "My Dental Practice",
        }),
      });

      const triggerData = await triggerRes.json();
      if (!triggerRes.ok) {
        throw new Error(triggerData.error || "Failed to initiate practice record.");
      }

      const { pendingAuditId } = triggerData;

      // Step 2: Unlock the lead, creating contact
      const [firstName, ...lastNames] = name.split(" ");
      const lastName = lastNames.join(" ") || "Prospect";

      const unlockRes = await fetch("/api/audit/unlock-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pendingAuditId,
          firstName,
          lastName,
          email,
          role: "Owner / Inbound Direct",
          consent: true,
        }),
      });

      const unlockData = await unlockRes.json();
      if (!unlockRes.ok) {
        throw new Error(unlockData.error || "Failed to process lead contact.");
      }

      const { publicToken } = unlockData;

      // Step 3: Book the meeting
      const bookRes = await fetch(`/api/audit/${publicToken}/book-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledTime, notes }),
      });

      const bookData = await bookRes.json();
      if (!bookRes.ok) {
        throw new Error(bookData.error || "Failed to finalize meeting schedule.");
      }

      router.push("/thank-you");
    } catch (err: any) {
      setError(err.message || "An error occurred while booking.");
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
        <div className="w-full max-w-xl rounded-3xl border border-line bg-white p-8 shadow-[0_20px_50px_-20px_rgba(8,44,58,0.12)]">
          <div className="text-center space-y-4">
            <Eyebrow>Online Consultation</Eyebrow>
            <h1 className="font-display text-3xl font-medium sm:text-[2.2rem] leading-tight">
              Book Your 15-Minute Review
            </h1>
            <p className="font-body text-xs text-slate max-w-md mx-auto">
              We'll look at your Google Map ranking live and identify the three biggest marketing gaps costing you patient calls.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl bg-coral/10 border border-coral/20 p-4 text-center text-sm font-semibold text-coral">
              {error}
            </div>
          )}

          <form onSubmit={handleBooking} className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="clinic-name" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Clinic Name
                </label>
                <input
                  id="clinic-name"
                  type="text"
                  required
                  placeholder="e.g. Bright Smiles"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="website" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Clinic Website URL
                </label>
                <input
                  id="website"
                  type="text"
                  required
                  placeholder="e.g. website.com"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="full-name" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Your Full Name
                </label>
                <input
                  id="full-name"
                  type="text"
                  required
                  placeholder="e.g. Dr. John Doe"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="email" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                  Professional Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. owner@website.com"
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="meeting-time" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                Preferred Date & Time
              </label>
              <input
                id="meeting-time"
                type="datetime-local"
                required
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="notes" className="block font-body text-xs font-semibold uppercase tracking-wider text-ink-2 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                placeholder="What is your biggest current patient acquisition bottleneck?"
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 font-body text-ink focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal h-24 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-teal py-4 font-body text-sm font-bold text-ink shadow-[0_12px_28px_-10px_rgba(14,170,155,0.4)] transition-colors hover:bg-teal-deep hover:text-white disabled:bg-line disabled:text-slate"
            >
              {loading ? "Confirming booking details..." : "Confirm Booking"}
            </button>
          </form>
        </div>
      </main>

      <footer className="py-6 text-center font-body text-[13px] text-slate border-t border-line">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
