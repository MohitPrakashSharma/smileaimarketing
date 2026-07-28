"use client";

import { motion, useReducedMotion } from "motion/react";

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="top" className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div>
          <p className="font-label text-[13px] uppercase tracking-[0.14em] text-teal-deep">
            Marketing built only for dental clinics
          </p>
          <h1 className="mt-5 font-display text-[2.5rem] leading-[1.08] font-medium text-ink sm:text-[3.25rem] lg:text-[3.6rem]">
            Dental marketing that turns local searches into{" "}
            <em className="not-italic text-teal-deep">booked patients.</em>
          </h1>
          <p className="mt-6 max-w-lg font-body text-lg leading-relaxed text-slate">
            We help dental clinics win local visibility, generate steady enquiries, and
            convert them into appointments — one clear process, run with AI-assisted
            execution, explained in plain English.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#contact"
              className="rounded-full bg-teal px-7 py-3.5 font-body text-[15px] font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(18,165,148,0.6)] transition-colors hover:bg-teal-deep hover:text-white"
            >
              Book a free strategy call
            </a>
            <a
              href="#process"
              className="font-body text-[15px] font-medium text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-teal"
            >
              See how it works
            </a>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-md">
          <svg viewBox="0 0 400 400" className="h-full w-full" aria-hidden>
            <circle cx="200" cy="200" r="188" fill="var(--color-mist)" />
            <motion.path
              d="M 84 224 C 130 300, 270 300, 316 224"
              fill="none"
              stroke="var(--color-teal)"
              strokeWidth="6"
              strokeLinecap="round"
              initial={reduceMotion ? undefined : { pathLength: 0 }}
              animate={reduceMotion ? undefined : { pathLength: 1 }}
              transition={{ duration: 1.1, delay: 0.2, ease: "easeInOut" }}
            />
            {/* map pin marking local visibility, sitting at the peak of the search->visit journey */}
            <motion.g
              initial={reduceMotion ? undefined : { opacity: 0, y: -10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <path
                d="M200 96c-19 0-34 15-34 34 0 25 34 58 34 58s34-33 34-58c0-19-15-34-34-34z"
                fill="var(--color-ink)"
              />
              <circle cx="200" cy="130" r="12" fill="var(--color-paper)" />
            </motion.g>
            <motion.circle
              cx="316"
              cy="224"
              r="7"
              fill="var(--color-coral)"
              initial={reduceMotion ? undefined : { scale: 0 }}
              animate={reduceMotion ? undefined : { scale: [0, 1.4, 1] }}
              transition={{ duration: 0.6, delay: 1.3 }}
            />
            <motion.circle
              cx="316"
              cy="224"
              r="7"
              fill="none"
              stroke="var(--color-coral)"
              strokeWidth="2"
              initial={reduceMotion ? undefined : { scale: 1, opacity: 0.6 }}
              animate={reduceMotion ? undefined : { scale: [1, 2.4], opacity: [0.6, 0] }}
              transition={{ duration: 1.8, delay: 1.5, repeat: Infinity, repeatDelay: 0.6 }}
            />
          </svg>
          <p className="absolute bottom-2 left-1/2 w-52 -translate-x-1/2 text-center font-label text-[12px] text-slate">
            A new enquiry lands the moment a patient finds you.
          </p>
        </div>
      </div>
    </section>
  );
}
