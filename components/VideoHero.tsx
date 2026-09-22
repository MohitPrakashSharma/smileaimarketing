"use client";

import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Cinematic full-bleed band: a muted clinic loop behind the headline and
 * three frosted, gradient-tinted feature cards. Stock footage — nobody shown
 * is a client.
 */
const FEATURES: { title: string; detail: string; href: string; cta: string }[] = [
  { title: "Free website audit", detail: "About two minutes, no logins — a plain-English report you keep.", href: "#seo-audit", cta: "Start the audit" },
  { title: "Dental practices only", detail: "Every check is built around how patients search for and choose a dentist.", href: "/about", cta: "About us" },
  { title: "Reviewed with you", detail: "A 15-minute walkthrough on screen or at your practice. No pitch, no obligation.", href: "/book-consultation", cta: "Book a consultation" },
];

export default function VideoHero() {
  const reduced = useReducedMotion();

  return (
    <section id="clinic" className="relative isolate overflow-hidden bg-[#17294c] text-white" aria-labelledby="clinic-heading">
      {/* Backdrop video (poster only when the visitor prefers reduced motion) */}
      <div className="absolute inset-0" aria-hidden>
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/video/clinic-reception-poster.jpg" alt="" className="h-full w-full object-cover" />
        ) : (
          <video
            className="h-full w-full object-cover"
            src="/video/clinic-reception.mp4"
            poster="/video/clinic-reception-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
        )}
        {/* Cinematic wash: heavier on the copy side, darker at the foot for the cards */}
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(23,41,76,0.82)_0%,rgba(23,41,76,0.55)_45%,rgba(23,41,76,0.28)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,transparent_0%,rgba(23,41,76,0.75)_100%)]" />
      </div>

      <div className="container-site relative flex min-h-[38rem] flex-col justify-between gap-12 py-14 sm:py-16 lg:min-h-[44rem] lg:py-20">
        <div className="max-w-2xl pt-2">
          <span className="text-eyebrow text-white/70">Smile AI Marketing · for Canadian dental practices</span>
          <h2 id="clinic-heading" className="mt-5 text-display-lg text-white">
            Grow your dental practice with <span className="text-accent-gradient">smarter digital marketing.</span>
          </h2>
          <p className="mt-5 max-w-xl text-body-large text-white/85">
            We help Canadian dental clinics get found in local search, attract more qualified patient enquiries, and turn their websites into a dependable source of new patients. It starts with a free audit of your website and local visibility.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="#seo-audit" arrow>
              Get Your Free Website Audit
            </ButtonLink>
            <ButtonLink href="/book-consultation" variant="ghost" className="border border-white/40 text-white hover:border-primary">
              Book a Consultation
            </ButtonLink>
          </div>
        </div>

        {/* Frosted cards with a brand-gradient tint */}
        <ul className="grid gap-3 sm:grid-cols-3 sm:gap-4">
          {FEATURES.map((f) => (
            <li key={f.title}>
            <Link
              href={f.href}
              className="group relative isolate block overflow-hidden rounded-[var(--radius-large)] border border-white/20 bg-[linear-gradient(135deg,rgba(59,103,178,0.42)_0%,rgba(59,103,178,0.22)_50%,rgba(59,162,179,0.30)_100%)] p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)] backdrop-blur-md transition-[transform,border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)] [-webkit-backdrop-filter:blur(12px)] hover:-translate-y-1 hover:border-white/50 hover:shadow-[0_28px_50px_-24px_rgba(59,103,178,0.6)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6"
            >
              {/* Solid gradient fills in on hover; a light sheen sweeps across */}
              <span className="pointer-events-none absolute inset-0 -z-10 bg-[image:var(--color-accent-gradient)] opacity-0 transition-opacity duration-[var(--duration-normal)] group-hover:opacity-90" aria-hidden />
              <span className="pointer-events-none absolute inset-y-0 -left-1/2 -z-10 w-1/2 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] transition-transform duration-700 ease-[var(--ease-out)] group-hover:translate-x-[300%] motion-reduce:hidden" aria-hidden />
              <p className="font-display text-[1.0625rem] font-semibold text-white">{f.title}</p>
              <p className="mt-1.5 text-body-small text-white/80 transition-colors duration-[var(--duration-normal)] group-hover:text-white/95">{f.detail}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-white/0 transition-[color,transform] duration-[var(--duration-normal)] group-hover:text-white/85">
                {f.cta}
                <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 -translate-x-1 transition-transform duration-[var(--duration-normal)] group-hover:translate-x-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3.5 10h12M11 5l4.5 5-4.5 5" />
                </svg>
              </span>
            </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
