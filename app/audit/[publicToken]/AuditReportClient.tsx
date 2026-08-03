"use client";

import { useEffect, useState } from "react";
import Eyebrow from "@/components/Eyebrow";
import { IconSearch, IconMapPin, IconClock, IconStar, IconCheck, IconCalendarCheck } from "@/components/icons";

export default function AuditReportClient({ publicToken }: { publicToken: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Offline visit request state
  const [address, setAddress] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);

  // Online booking state
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/audit/${publicToken}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load audit");
        }
        setData(json);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [publicToken]);

  const handleInPersonRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisitLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/audit/${publicToken}/request-visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, preferredWindow, notes }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to submit request");
      }
      setVisitSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Error submitting visit request");
    } finally {
      setVisitLoading(false);
    }
  };

  const handleOnlineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/audit/${publicToken}/book-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledTime: meetingTime, notes: meetingNotes }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to schedule meeting");
      }
      setBookingSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Error scheduling meeting");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-teal mx-auto" />
          <p className="font-body text-sm font-semibold">Generating your dental marketing audit...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <div className="text-center max-w-md p-6 rounded-3xl border border-line bg-white shadow-xl">
          <p className="font-display text-lg font-bold text-coral mb-4">Error Loading Report</p>
          <p className="font-body text-slate text-sm mb-6">{error || "Could not retrieve the specified audit report."}</p>
          <a href="/free-dental-audit" className="rounded-full bg-teal px-6 py-3 font-body text-sm font-semibold text-ink hover:bg-teal-deep hover:text-white transition-colors">
            Try a New Audit
          </a>
        </div>
      </div>
    );
  }

  const { business, scorecard, findings, competitors } = data;

  return (
    <div className="min-h-screen bg-paper text-ink selection:bg-teal selection:text-white font-body pb-16">
      {/* Header Banner */}
      <header className="border-b border-line bg-white py-6 shadow-sm">
        <div className="mx-auto max-w-[1200px] px-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Eyebrow>Dental Performance Scorecard</Eyebrow>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-medium">
              {business.name}
            </h1>
            <p className="text-sm text-slate">{business.website} &bull; {business.city}</p>
          </div>
          
          <div className="flex items-center gap-4 bg-mist rounded-2xl px-5 py-4 border border-line">
            <div className="text-center">
              <span className="block font-label text-[10px] uppercase tracking-wider text-slate">Opportunity Score</span>
              <span className="font-display text-3xl font-bold text-teal-deep">{business.opportunityScore}<span className="text-sm font-normal text-slate">/100</span></span>
            </div>
            <div className="h-8 w-px bg-line" />
            <p className="text-xs text-slate font-medium max-w-[140px] leading-tight">
              {business.opportunityScore >= 70 ? "Healthy local presence." : "High visibility gap discovered."}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 sm:px-8 mt-10 grid gap-8 lg:grid-cols-[65%_35%]">
        
        {/* Left Column: Score breakdown and detailed findings */}
        <div className="space-y-8">
          
          {/* Categories Grid */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold mb-6">Marketing Performance Breakdown</h2>
            <div className="grid gap-4 sm:grid-cols-5 text-center">
              <div className="p-3 bg-paper rounded-xl border border-line">
                <span className="block font-label text-[10px] uppercase tracking-wider text-slate mb-1">Local Maps</span>
                <span className="font-display text-2xl font-bold text-teal">{scorecard.localVisibility}<span className="text-xs font-normal text-slate">/30</span></span>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-line">
                <span className="block font-label text-[10px] uppercase tracking-wider text-slate mb-1">Web Quality</span>
                <span className="font-display text-2xl font-bold text-teal">{scorecard.websiteQuality}<span className="text-xs font-normal text-slate">/20</span></span>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-line">
                <span className="block font-label text-[10px] uppercase tracking-wider text-slate mb-1">Conversion</span>
                <span className="font-display text-2xl font-bold text-teal">{scorecard.conversionExperience}<span className="text-xs font-normal text-slate">/20</span></span>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-line">
                <span className="block font-label text-[10px] uppercase tracking-wider text-slate mb-1">Reviews</span>
                <span className="font-display text-2xl font-bold text-teal">{scorecard.reviewsReputation}<span className="text-xs font-normal text-slate">/15</span></span>
              </div>
              <div className="p-3 bg-paper rounded-xl border border-line">
                <span className="block font-label text-[10px] uppercase tracking-wider text-slate mb-1">Competitor Gap</span>
                <span className="font-display text-2xl font-bold text-teal">{scorecard.competitorGap}<span className="text-xs font-normal text-slate">/15</span></span>
              </div>
            </div>
          </div>

          {/* Detailed Audit Findings */}
          <div className="space-y-4">
            <h2 className="font-display text-xl font-semibold px-1">Detailed Findings & Action Plan</h2>
            
            {findings.map((item: any, idx: number) => (
              <div key={idx} className="rounded-3xl border border-line bg-white p-6 shadow-sm flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist text-teal-deep font-display font-semibold">
                  {idx + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="font-body font-bold text-[16px] text-ink">{item.title}</h3>
                  <p className="text-[14px] leading-relaxed text-slate">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Competitor Gap Panel */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <h2 className="font-display text-xl font-semibold mb-4">Local Competitor Comparison</h2>
            <p className="text-xs text-slate mb-6">Here is how your practice matches up against the highest ranking clinics in {business.city}:</p>
            
            <div className="space-y-3">
              <div className="grid grid-cols-3 text-xs font-bold text-slate uppercase tracking-wider border-b border-line pb-2">
                <span>Clinic Name</span>
                <span className="text-center">Search Rank</span>
                <span className="text-right">Local Map Pack Score</span>
              </div>
              
              <div className="grid grid-cols-3 text-sm font-semibold py-2">
                <span className="text-teal-deep">{business.name} (You)</span>
                <span className="text-center text-slate">#6</span>
                <span className="text-right text-slate">{business.opportunityScore}</span>
              </div>

              {competitors.map((c: any, index: number) => (
                <div key={index} className="grid grid-cols-3 text-sm py-2 border-t border-line/60">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-center text-slate">#{c.rank}</span>
                  <span className="text-right text-slate">{c.mapScore || "N/A"}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Actions / Meeting Scheduling Forms */}
        <div className="space-y-8">
          
          {/* Action 1: Book Online consultation */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal/10 text-teal-deep mb-4">
              <IconCalendarCheck className="h-5 w-5" />
            </span>
            <h3 className="font-display text-lg font-bold">15-Min Online Video Audit</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate">
              Book a live screen share with our dental strategist. We'll show you exactly how competitors in your area are diverting map searches.
            </p>

            {bookingSubmitted ? (
              <div className="mt-6 rounded-2xl bg-teal/10 border border-teal/20 p-4 text-center text-xs font-semibold text-teal-deep">
                Meeting request sent successfully! We have stopped automated sequences for your clinic and sent calendar credentials to your email.
              </div>
            ) : (
              <form onSubmit={handleOnlineBooking} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="meeting-time" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Select Date & Time</label>
                  <input
                    id="meeting-time"
                    type="datetime-local"
                    required
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs font-body focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="meeting-notes" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Notes / Special Requests</label>
                  <textarea
                    id="meeting-notes"
                    placeholder="e.g. Discuss my maps ranking specifically..."
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs font-body focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal h-16 resize-none"
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full rounded-full bg-teal py-3 text-xs font-bold text-ink hover:bg-teal-deep hover:text-white transition-colors"
                >
                  {bookingLoading ? "Scheduling..." : "Schedule My Video Review"}
                </button>
              </form>
            )}
          </div>

          {/* Action 2: In-person Drop off */}
          <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/10 text-coral mb-4">
              <IconMapPin className="h-5 w-5" />
            </span>
            <h3 className="font-display text-lg font-bold">Request In-Person Visit</h3>
            <p className="mt-2 text-xs leading-relaxed text-slate">
              Request a local consultant to visit your clinic and drop off a bound copy of this visibility report.
            </p>

            {visitSubmitted ? (
              <div className="mt-6 rounded-2xl bg-coral/10 border border-coral/20 p-4 text-center text-xs font-semibold text-coral">
                Visit request received! Our sales representative will verify your service area and contact your clinic to confirm a timing window.
              </div>
            ) : (
              <form onSubmit={handleInPersonRequest} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="visit-address" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Clinic Delivery Address</label>
                  <input
                    id="visit-address"
                    type="text"
                    required
                    placeholder="e.g. 123 Main St, Suite 4"
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs font-body focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="visit-window" className="block text-[10px] font-bold uppercase tracking-wider text-slate mb-1">Preferred Delivery Hours</label>
                  <input
                    id="visit-window"
                    type="text"
                    required
                    placeholder="e.g. Tuesday morning, 9am - 11am"
                    className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs font-body focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                    value={preferredWindow}
                    onChange={(e) => setPreferredWindow(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={visitLoading}
                  className="w-full rounded-full border border-line bg-white py-3 text-xs font-bold text-ink hover:border-teal hover:text-teal-deep transition-colors"
                >
                  {visitLoading ? "Submitting..." : "Submit Delivery Request"}
                </button>
              </form>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
