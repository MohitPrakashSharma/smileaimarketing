"use client";

import { motion, useReducedMotion } from "motion/react";

const STEPS = [
  {
    label: "Visibility",
    x: 60,
    y: 200,
    copy: "Show up when patients search “dentist near me” — Google Maps, search, and your profile.",
  },
  {
    label: "Enquiries",
    x: 346,
    y: 150,
    copy: "Turn that visibility into calls, messages, and form fills from a site built to convert.",
  },
  {
    label: "Conversion",
    x: 633,
    y: 100,
    copy: "Fast, AI-assisted follow-up turns enquiries into booked appointments before they go cold.",
  },
  {
    label: "Growth",
    x: 920,
    y: 50,
    copy: "Reviews, recall, and referrals compound — so next month starts ahead of this one.",
  },
];

const PATH =
  "M60,200 Q203,240 346,150 Q489,190 633,100 Q776,140 920,50";

export default function ProcessFlow() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="process" className="bg-ink py-20 text-white sm:py-28">
      <div className="mx-auto max-w-6xl px-6 sm:px-8">
        <p className="font-label text-[13px] uppercase tracking-[0.14em] text-teal">
          How growth happens
        </p>
        <h2 className="mt-4 max-w-xl font-display text-3xl font-medium sm:text-4xl">
          One process, four steps, run every month.
        </h2>

        {/* Desktop: scalloped ascending arc connecting the four stages */}
        <div className="mt-16 hidden sm:block">
          <svg viewBox="0 0 980 260" className="w-full overflow-visible">
            <motion.path
              d={PATH}
              fill="none"
              stroke="var(--color-teal)"
              strokeWidth="3"
              strokeLinecap="round"
              initial={reduceMotion ? undefined : { pathLength: 0 }}
              whileInView={reduceMotion ? undefined : { pathLength: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1.4, ease: "easeInOut" }}
            />
            {STEPS.map((step, i) => (
              <motion.g
                key={step.label}
                initial={reduceMotion ? undefined : { opacity: 0, scale: 0.4 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.32 }}
              >
                <circle cx={step.x} cy={step.y} r="9" fill="var(--color-coral)" />
                <circle
                  cx={step.x}
                  cy={step.y}
                  r="16"
                  fill="none"
                  stroke="var(--color-coral)"
                  strokeOpacity="0.35"
                  strokeWidth="1.5"
                />
              </motion.g>
            ))}
          </svg>

          <div className="grid grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.label}>
                <p className="font-label text-[12px] text-teal">0{i + 1}</p>
                <h3 className="mt-1 font-display text-xl font-medium">{step.label}</h3>
                <p className="mt-2 font-body text-[14.5px] leading-relaxed text-white/65">
                  {step.copy}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <ol className="mt-12 space-y-8 border-l border-white/15 pl-6 sm:hidden">
          {STEPS.map((step, i) => (
            <li key={step.label} className="relative">
              <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full bg-coral" />
              <p className="font-label text-[12px] text-teal">0{i + 1}</p>
              <h3 className="mt-1 font-display text-xl font-medium">{step.label}</h3>
              <p className="mt-2 font-body text-[14.5px] leading-relaxed text-white/65">
                {step.copy}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
