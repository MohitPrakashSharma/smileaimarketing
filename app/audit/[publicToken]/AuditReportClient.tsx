"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { IconMapPin, IconCalendarCheck } from "@/components/icons";

type Finding = {
  category: string;
  score: number;
  title: string;
  detail: string;
};

type Competitor = {
  name: string;
  rank: number;
  mapScore: number | null;
};

type AuditData = {
  business: { name: string; website: string; city: string; opportunityScore: number };
  scorecard: {
    localVisibility: number;
    websiteQuality: number;
    conversionExperience: number;
    reviewsReputation: number;
    competitorGap: number;
  };
  findings: Finding[];
  competitors: Competitor[];
};

const ACTION_LABELS: Record<string, string> = {
  LOCAL_VISIBILITY: "Strengthen your local map ranking",
  WEBSITE_QUALITY: "Improve site speed & structure",
  CONVERSION: "Add an online booking option",
  REPUTATION: "Grow your review volume",
  COMPETITOR_GAP: "Close the competitor review gap",
};

export default function AuditReportClient({ publicToken }: { publicToken: string }) {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Offline visit request state
  const [address, setAddress] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitError, setVisitError] = useState("");

  // Online booking state
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/audit/${publicToken}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load audit");
        }
        setData(json);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [publicToken]);

  const handleInPersonRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (visitLoading) return;
    setVisitLoading(true);
    setVisitError("");

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
    } catch (err: unknown) {
      setVisitError(err instanceof Error ? err.message : "Error submitting visit request");
    } finally {
      setVisitLoading(false);
    }
  };

  const handleOnlineBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bookingLoading) return;
    setBookingLoading(true);
    setBookingError("");

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
    } catch (err: unknown) {
      setBookingError(err instanceof Error ? err.message : "Error scheduling meeting");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
          <p className="text-body-small font-semibold text-muted-foreground">Loading your audit report...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-lg">
          <p className="text-heading-3 font-bold text-danger">Report Not Found</p>
          <p className="mt-3 text-body-small text-muted-foreground">
            {error || "Could not retrieve the specified audit report."}
          </p>
          <Link
            href="/free-dental-audit"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-body-small font-bold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Run a New Audit
          </Link>
        </div>
      </div>
    );
  }

  const { business, scorecard, findings, competitors } = data;

  const priorityFindings = [...findings]
    .filter((f) => f.category !== "COMPETITOR_GAP")
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-16 text-foreground">
      {/* Header Banner */}
      <header className="border-b border-border bg-surface py-6 shadow-sm">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Eyebrow>Dental Growth Scorecard</Eyebrow>
            <h1 className="mt-2 text-heading-1 font-semibold text-foreground">{business.name}</h1>
            <p className="text-body-small text-muted-foreground">
              {business.website} &bull; {business.city}
            </p>
          </div>

          <div className="animate-scale-in flex items-center gap-4 rounded-2xl border border-border bg-surface-muted/40 px-5 py-4">
            <div className="text-center">
              <span className="block text-metadata font-bold uppercase tracking-wider text-muted-foreground">
                Overall Score
              </span>
              <span className="text-display font-bold text-primary">
                {business.opportunityScore}
                <span className="text-body-small font-normal text-muted-foreground">/100</span>
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <p className="max-w-[140px] text-body-small font-medium leading-tight text-muted-foreground">
              {business.opportunityScore >= 70 ? "Healthy local presence." : "High visibility gap discovered."}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-10 grid max-w-[1200px] gap-8 px-6 sm:px-8 lg:grid-cols-[63%_37%]">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Score breakdown */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-heading-3 font-semibold text-foreground">Performance Breakdown</h2>
            <div className="mt-6 grid grid-cols-2 gap-3 text-center sm:grid-cols-5">
              {[
                { label: "Local Maps", value: scorecard.localVisibility, max: 30 },
                { label: "Web Quality", value: scorecard.websiteQuality, max: 20 },
                { label: "Conversion", value: scorecard.conversionExperience, max: 20 },
                { label: "Reviews", value: scorecard.reviewsReputation, max: 15 },
                { label: "Competitor Gap", value: scorecard.competitorGap, max: 15 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background p-3">
                  <span className="mb-1 block text-metadata font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-heading-3 font-bold text-primary">
                    {item.value}
                    <span className="text-body-small font-normal text-muted-foreground">/{item.max}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Findings */}
          <div className="space-y-4">
            <h2 className="px-1 text-heading-3 font-semibold text-foreground">Key Findings</h2>
            {priorityFindings.map((item, idx) => (
              <div key={item.category} className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-primary">
                  {idx + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="text-body font-bold text-foreground">{item.title}</h3>
                  <p className="text-body-small leading-relaxed text-muted-foreground">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Recommended Actions */}
          <div className="rounded-2xl border border-border bg-surface-muted/30 p-6">
            <h2 className="text-heading-3 font-semibold text-foreground">Recommended Actions</h2>
            <ol className="mt-4 space-y-3">
              {priorityFindings.map((item) => (
                <li key={item.category} className="flex items-start gap-3 text-body-small text-foreground">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{ACTION_LABELS[item.category] || item.title}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Competitor Gap Panel */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-heading-3 font-semibold text-foreground">Local Competitor Comparison</h2>
            <p className="mt-1 mb-6 text-body-small text-muted-foreground">
              How you match up against the highest-ranking practices in {business.city}.
            </p>

            <div className="space-y-1">
              <div className="grid grid-cols-3 gap-2 border-b border-border pb-2 text-metadata font-bold uppercase tracking-wider text-muted-foreground">
                <span>Practice</span>
                <span className="text-center">Search Rank</span>
                <span className="text-right">Map Score</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2.5 text-body-small font-semibold">
                <span className="truncate text-primary">{business.name} (You)</span>
                <span className="text-center text-muted-foreground">&mdash;</span>
                <span className="text-right text-muted-foreground">{business.opportunityScore}</span>
              </div>

              {competitors.map((c, index) => (
                <div key={index} className="grid grid-cols-3 gap-2 border-t border-border/60 py-2.5 text-body-small">
                  <span className="truncate font-medium text-foreground">{c.name}</span>
                  <span className="text-center text-muted-foreground">#{c.rank}</span>
                  <span className="text-right text-muted-foreground">{c.mapScore ?? "N/A"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Consultation actions */}
        <div className="space-y-8">
          {/* Online consultation */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
              <IconCalendarCheck className="h-5 w-5" />
            </span>
            <h3 className="text-body font-bold text-foreground">15-Min Online Video Audit</h3>
            <p className="mt-2 text-body-small leading-relaxed text-muted-foreground">
              A live screen share with our dental strategist to review exactly how competitors are outranking you.
            </p>

            {bookingSubmitted ? (
              <div className="mt-6 rounded-xl border border-primary/20 bg-accent-soft p-4 text-center text-body-small font-semibold text-primary">
                Meeting request sent! Calendar details are on their way to your email.
              </div>
            ) : (
              <form onSubmit={handleOnlineBooking} className="mt-6 space-y-4" noValidate>
                {bookingError && (
                  <div role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">
                    {bookingError}
                  </div>
                )}
                <FormField id="meeting-time" label="Select Date & Time" required optionalLabel={false}>
                  <Input
                    id="meeting-time"
                    type="datetime-local"
                    required
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                  />
                </FormField>
                <FormField id="meeting-notes" label="Notes / Special Requests">
                  <Textarea
                    id="meeting-notes"
                    rows={3}
                    placeholder="e.g. Discuss my maps ranking specifically..."
                    value={meetingNotes}
                    onChange={(e) => setMeetingNotes(e.target.value)}
                  />
                </FormField>
                <Button type="submit" fullWidth loading={bookingLoading} disabled={bookingLoading}>
                  Schedule My Video Review
                </Button>
              </form>
            )}
          </div>

          {/* In-person visit */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary">
              <IconMapPin className="h-5 w-5" />
            </span>
            <h3 className="text-body font-bold text-foreground">Request In-Person Visit</h3>
            <p className="mt-2 text-body-small leading-relaxed text-muted-foreground">
              Have a local consultant walk your team through this report at your practice.
            </p>

            {visitSubmitted ? (
              <div className="mt-6 rounded-xl border border-primary/20 bg-accent-soft p-4 text-center text-body-small font-semibold text-primary">
                Visit request received! We&apos;ll confirm a timing window shortly.
              </div>
            ) : (
              <form onSubmit={handleInPersonRequest} className="mt-6 space-y-4" noValidate>
                {visitError && (
                  <div role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">
                    {visitError}
                  </div>
                )}
                <FormField id="visit-address" label="Clinic Address" required optionalLabel={false}>
                  <Input
                    id="visit-address"
                    type="text"
                    required
                    autoComplete="street-address"
                    placeholder="e.g. 123 Main St, Suite 4"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </FormField>
                <FormField id="visit-window" label="Preferred Window" required optionalLabel={false}>
                  <Input
                    id="visit-window"
                    type="text"
                    required
                    placeholder="e.g. Tuesday morning, 9-11am"
                    value={preferredWindow}
                    onChange={(e) => setPreferredWindow(e.target.value)}
                  />
                </FormField>
                <FormField id="visit-notes" label="Notes">
                  <Textarea
                    id="visit-notes"
                    rows={2}
                    placeholder="Anything our consultant should know before visiting?"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </FormField>
                <Button type="submit" variant="secondary" fullWidth loading={visitLoading} disabled={visitLoading}>
                  Submit Visit Request
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
