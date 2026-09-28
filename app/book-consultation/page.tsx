"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CnTowerVector from "@/components/contact/CnTowerVector";
import { CONTACT } from "@/lib/siteConfig";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics.client";
import { TECHNICAL_REPORT_REQUEST_PARAM, TECHNICAL_REPORT_REQUEST_VALUE } from "@/lib/audit/technicalReport";

function BookConsultationForm() {
  const searchParams = useSearchParams();
  const isInPerson = searchParams.get("type") === "in-person";
  const consultationType = isInPerson ? "in_person" : "online";
  const publicToken = searchParams.get("publicToken");
  // "Request Full Technical Report" from a report: same form, same endpoints — the
  // booking is flagged so our team knows to bring the report; nothing is auto-sent.
  const technicalReport = !!publicToken && searchParams.get(TECHNICAL_REPORT_REQUEST_PARAM) === TECHNICAL_REPORT_REQUEST_VALUE;
  const router = useRouter();
  const hasStartedBooking = useRef(false);

  useEffect(() => {
    trackEvent("consultation_view", { type: consultationType });
  }, [consultationType]);

  const handleBookingStart = () => {
    if (hasStartedBooking.current) return;
    hasStartedBooking.current = true;
    trackEvent("booking_start", { type: consultationType });
  };

  // Cold-start fields — only needed when there's no existing audit to attach this booking to.
  const [website, setWebsite] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");

  // Scheduling fields — needed either way, this is the whole point of the page.
  const [scheduledTime, setScheduledTime] = useState("");
  const [address, setAddress] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const submitScheduling = async (token: string) => {
    const bookRes = await fetch(
      isInPerson ? `/api/audit/${token}/request-visit` : `/api/audit/${token}/book-meeting`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isInPerson
            ? { address, preferredWindow, notes, technicalReport }
            // scheduledTime comes from a datetime-local input — no seconds or
            // timezone, which fails the API's z.string().datetime() validation.
            : { scheduledTime: new Date(scheduledTime).toISOString(), notes, technicalReport }
        ),
      }
    );
    const bookData = await bookRes.json();
    if (!bookRes.ok) {
      throw new Error(bookData.error || "Failed to finalize your request.");
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    if (!isInPerson && (!scheduledTime || Number.isNaN(new Date(scheduledTime).getTime()))) {
      setError("Please choose a date and time for your consultation.");
      return;
    }
    trackEvent("booking_submit", { type: consultationType });
    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      // Fast path: this visitor already has an audit (came from their report or an email CTA) —
      // nothing to re-collect, just schedule.
      if (publicToken) {
        await submitScheduling(publicToken);
        router.push(technicalReport ? `/thank-you?${TECHNICAL_REPORT_REQUEST_PARAM}=${TECHNICAL_REPORT_REQUEST_VALUE}` : "/thank-you");
        return;
      }

      // Cold start: no existing audit, so we create one from the minimum needed to identify the practice.
      let formattedUrl = website.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }
      const derivedClinicName = website
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split(/[./]/)[0];

      const triggerRes = await fetch("/api/audit/inbound-trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: formattedUrl,
          city: city.trim() || "Inbound Search",
          clinicName: derivedClinicName || "My Dental Practice",
        }),
      });

      const triggerData = await triggerRes.json();
      if (!triggerRes.ok) {
        throw new Error(triggerData.error || "Failed to initiate practice record.");
      }

      const { pendingAuditId } = triggerData;

      const [firstName, ...lastNames] = name.trim().split(" ");
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

      await submitScheduling(unlockData.publicToken);
      router.push("/thank-you");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while booking.");
      submitting.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="card-elevated w-full p-6 sm:p-8">
      <div className="space-y-3">
        {/* Only the variants label themselves; the default card's heading and
            intro already say what it is. */}
        {(technicalReport || isInPerson) && (
          <Eyebrow>{technicalReport ? "Full technical report" : "In-person visit"}</Eyebrow>
        )}
        <h2 className="text-heading-3 text-foreground">
          {technicalReport ? "Request your full technical report" : isInPerson ? "Request an in-person visit" : "Book a consultation"}
        </h2>
        {/* `max-w-md` dated from when this card sat in a narrow column; the card
            now spans the container, so the intro can use a full reading measure. */}
        <p className="max-w-[46rem] text-body text-muted-foreground">
          {technicalReport
            ? "Book a website review with our team. We'll walk through your audit findings together and provide the complete technical breakdown as part of the follow-up — it isn't sent automatically."
            : isInPerson
              ? "Tell us where you are and when suits. We'll confirm a time to walk your team through your audit findings in person, where we're able to."
              : "We'll look at how your practice shows up for nearby patients, walk through your audit findings, and agree on what's worth fixing first. No pitch, no obligation."}
        </p>
        {technicalReport && (
          <p className="max-w-md text-body-small text-muted-foreground">
            Prefer an in-person visit?{" "}
            <a href={`/book-consultation?publicToken=${encodeURIComponent(publicToken!)}&type=in-person&${TECHNICAL_REPORT_REQUEST_PARAM}=${TECHNICAL_REPORT_REQUEST_VALUE}`} className="link-underline text-primary-ink">
              Request one instead
            </a>
            .
          </p>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-6 rounded-[var(--radius-small)] border border-danger/20 bg-danger/5 px-4 py-3 text-body-small font-medium text-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleBooking} onChange={handleBookingStart} className="mt-6 space-y-4" noValidate>
        {!publicToken && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="website" label="Practice website" required optionalLabel={false}>
                <Input
                  id="website"
                  type="text"
                  required
                  inputMode="url"
                  autoComplete="url"
                  placeholder="e.g. yourpractice.ca"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </FormField>

              <FormField id="city" label="City" required optionalLabel={false}>
                <Input
                  id="city"
                  type="text"
                  required
                  autoComplete="address-level2"
                  placeholder="e.g. Toronto"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="full-name" label="Your name" required optionalLabel={false}>
                <Input
                  id="full-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="e.g. Dr. Priya Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormField>
              <FormField id="email" label="Email" required optionalLabel={false}>
                <Input
                  id="email"
                  type="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  placeholder="e.g. dr.sharma@yourpractice.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormField>
            </div>
          </>
        )}

        {isInPerson ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="address" label="Practice address" required optionalLabel={false}>
                <Input
                  id="address"
                  type="text"
                  required
                  autoComplete="street-address"
                  placeholder="e.g. 123 Main St, Suite 4"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </FormField>
              <FormField id="preferred-window" label="Preferred time window" required optionalLabel={false}>
                <Input
                  id="preferred-window"
                  type="text"
                  required
                  placeholder="e.g. Tuesday morning, 9–11 a.m."
                  value={preferredWindow}
                  onChange={(e) => setPreferredWindow(e.target.value)}
                />
              </FormField>
            </div>
          </>
        ) : (
          <FormField id="meeting-time" label="Preferred date and time" required optionalLabel={false}>
            <Input
              id="meeting-time"
              type="datetime-local"
              required
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </FormField>
        )}

        <FormField id="notes" label="Notes">
          <Textarea
            id="notes"
            rows={2}
            placeholder="Anything we should know before we talk?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FormField>

        <Button type="submit" fullWidth loading={loading} disabled={loading} arrow className="mt-2">
          {technicalReport ? "Request the Technical Report" : isInPerson ? "Request an In-Person Visit" : "Confirm My Consultation"}
        </Button>
        {technicalReport && (
          <p className="text-metadata">Our team reviews every request and shares the technical report after the follow-up conversation.</p>
        )}
      </form>
    </div>
  );
}

const OFFICE_QUERY = encodeURIComponent(`${CONTACT.address.join(", ")}`);

function ContactDetail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-eyebrow text-secondary-ink">{label}</dt>
      <dd className="mt-2 text-body-small text-foreground">{children}</dd>
    </div>
  );
}

export default function BookConsultationPage() {
  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        {/* Masthead, form and details share one backdrop so the tower runs the
            whole way down rather than stopping at the end of the heading. */}
        <div className="relative overflow-hidden">
          {/* Behind everything: the tower spans the full height of the group,
              so its shaft passes the form and its base spreads under the
              details. `z-0` with the content at `z-10` — a negative z-index
              would drop it behind the wrapper's own background and vanish. */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[72%] sm:right-[2%] sm:w-[54%] lg:right-[4%] lg:w-[44%]">
            <CnTowerVector className="h-full w-full" />
          </div>

          {/* No min-height here: the heading sets its own measure, and centring
              it in a tall box was what put the air above and below it. */}
          <section className="relative z-10">
            <div className="container-site relative pb-4 pt-10 sm:pb-6 sm:pt-14">
              {/* Ink on top of a pale tower: a difference blend inverted the
                  brand blue to orange, which is off-palette. The tower is light
                  enough that the heading simply sits over it. */}
              <h1 className="relative text-[clamp(2.75rem,15vw,225px)] font-bold leading-[0.88] tracking-[-0.05em] text-foreground">
                Contact us
              </h1>
            </div>
          </section>

          {/* The form, full width of the container */}
          <section className="container-site relative z-10 pb-[var(--section-space-sm)] pt-8">
            <Suspense
              fallback={
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
              }
            >
              <BookConsultationForm />
            </Suspense>
          </section>

          {/* Ways to reach us, in a card matching the form above it */}
          <section className="container-site relative z-10 pb-[var(--section-space)]">
            <div className="card-elevated grid gap-10 p-6 sm:grid-cols-2 sm:p-8 lg:grid-cols-4 lg:gap-12">
              <p className="text-body-small text-muted-foreground">
                For an audit walkthrough, a question about your website, or an in-person visit — reach out and we will
                come back to you.
              </p>
              <ContactDetail label="Email">
                <a href={`mailto:${CONTACT.email}`} className="link-underline font-medium">
                  {CONTACT.email}
                </a>
              </ContactDetail>
              <ContactDetail label="Phone">
                <a href={CONTACT.phone.href} className="link-underline font-medium">
                  {CONTACT.phone.display}
                </a>
              </ContactDetail>
              <ContactDetail label="Office">
                {CONTACT.address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </ContactDetail>
            </div>
          </section>
        </div>

        {/* Map, edge to edge, closing the page */}
        <section aria-label="Our location" className="relative h-[20rem] w-full border-t border-border sm:h-[24rem] lg:h-[28rem]">
          <iframe
            title={`Map showing ${CONTACT.address.join(", ")}`}
            src={`https://www.google.com/maps?q=${OFFICE_QUERY}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0"
          />
        </section>
      </main>
      <Footer />
    </>
  );
}
