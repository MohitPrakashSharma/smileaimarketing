"use client";

import { useState } from "react";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { IconCalendarCheck, IconMapPin } from "@/components/icons";
import type { IndustryProfile } from "@/lib/industry";

/**
 * The two consultation forms (video review, in-person visit) — one compact
 * panel with a tab per option so the report, not the pitch, owns the page.
 * Same endpoints and validation as before.
 */
export default function ConsultationSidebar({ publicToken, ind, compact = true }: { publicToken: string; ind: IndustryProfile; compact?: boolean }) {
  const [mode, setMode] = useState<"video" | "visit">("video");

  // In-person visit
  const [address, setAddress] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [visitSubmitted, setVisitSubmitted] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);
  const [visitError, setVisitError] = useState("");

  // Video review
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

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
    if (!meetingTime || Number.isNaN(new Date(meetingTime).getTime())) {
      setBookingError("Please pick a date and time");
      return;
    }
    setBookingLoading(true);
    setBookingError("");
    try {
      const res = await fetch(`/api/audit/${publicToken}/book-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // datetime-local has no seconds/timezone; the API validates a full ISO string.
        body: JSON.stringify({ scheduledTime: new Date(meetingTime).toISOString(), notes: meetingNotes }),
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

  const videoForm = bookingSubmitted ? (
    <div className="rounded-xl border border-primary/20 bg-accent-soft p-4 text-center text-body-small font-semibold text-primary">Meeting request sent! Calendar details are on their way to your email.</div>
  ) : (
    <form onSubmit={handleOnlineBooking} className="space-y-3" noValidate>
      {bookingError && <div role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">{bookingError}</div>}
      <FormField id="meeting-time" label="Date & time" required optionalLabel={false}>
        <Input id="meeting-time" type="datetime-local" required value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
      </FormField>
      <FormField id="meeting-notes" label="Anything specific to cover?">
        <Textarea id="meeting-notes" rows={2} placeholder="e.g. the page speed findings" value={meetingNotes} onChange={(e) => setMeetingNotes(e.target.value)} />
      </FormField>
      <Button type="submit" fullWidth loading={bookingLoading} disabled={bookingLoading}>Schedule my video review</Button>
    </form>
  );

  const visitForm = visitSubmitted ? (
    <div className="rounded-xl border border-primary/20 bg-accent-soft p-4 text-center text-body-small font-semibold text-primary">Visit request received! We&apos;ll confirm a timing window shortly.</div>
  ) : (
    <form onSubmit={handleInPersonRequest} className="space-y-3" noValidate>
      {visitError && <div role="alert" className="rounded-lg border border-danger/20 bg-danger/10 p-3 text-center text-metadata font-semibold text-danger">{visitError}</div>}
      <FormField id="visit-address" label="Clinic address" required optionalLabel={false}>
        <Input id="visit-address" type="text" required autoComplete="street-address" placeholder="e.g. 123 Main St, Suite 4" value={address} onChange={(e) => setAddress(e.target.value)} />
      </FormField>
      <FormField id="visit-window" label="Preferred window" required optionalLabel={false}>
        <Input id="visit-window" type="text" required placeholder="e.g. Tuesday morning, 9–11am" value={preferredWindow} onChange={(e) => setPreferredWindow(e.target.value)} />
      </FormField>
      <FormField id="visit-notes" label="Notes">
        <Textarea id="visit-notes" rows={2} placeholder="Anything our consultant should know?" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
      <Button type="submit" variant="secondary" fullWidth loading={visitLoading} disabled={visitLoading}>Request a visit</Button>
    </form>
  );

  if (!compact) {
    // Legacy layout: two stacked cards (unchanged look for V1 reports).
    return (
      <div id="consultation" className="scroll-mt-6 space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary"><IconCalendarCheck className="h-5 w-5" /></span>
          <h3 className="text-body font-bold text-foreground">Talk it through, 15 minutes on video</h3>
          <p className="mt-2 mb-6 text-body-small leading-relaxed text-muted-foreground">We&apos;ll screen-share this report together and show you exactly what a {ind.customer} sees when they search for a {ind.searchKeyword} near you — no pitch, just the facts.</p>
          {videoForm}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-primary"><IconMapPin className="h-5 w-5" /></span>
          <h3 className="text-body font-bold text-foreground">Or we&apos;ll come to you</h3>
          <p className="mt-2 mb-6 text-body-small leading-relaxed text-muted-foreground">A local consultant visits your {ind.business} and walks your whole team through the findings in person.</p>
          {visitForm}
        </div>
      </div>
    );
  }

  return (
    <aside id="consultation" className="scroll-mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-6">
      <p className="text-metadata font-bold uppercase tracking-wider text-primary">Walk through this report with us</p>
      <p className="mt-1 text-body-small leading-relaxed text-muted-foreground">Fifteen minutes, no pitch: we show you what a {ind.customer} sees when they search for a {ind.searchKeyword} near you, and which fixes matter first.</p>
      <div role="tablist" aria-label="How would you like to meet?" className="mt-4 grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-0.5">
        {(
          [
            ["video", "On video", IconCalendarCheck],
            ["visit", "In person", IconMapPin],
          ] as const
        ).map(([key, label, Icon]) => (
          <button key={key} type="button" role="tab" aria-selected={mode === key} onClick={() => setMode(key)} className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-metadata font-semibold transition-colors ${mode === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {mode === "video" ? videoForm : (
          <>
            <p className="mb-3 text-[12px] text-muted-foreground">A local consultant visits your {ind.business} and walks your team through the findings.</p>
            {visitForm}
          </>
        )}
      </div>
    </aside>
  );
}
