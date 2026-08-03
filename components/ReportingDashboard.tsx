"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { IconMapPin, IconChat, IconCalendarCheck, IconStar } from "@/components/icons";
import Eyebrow from "@/components/Eyebrow";

const METRICS = [
  {
    Icon: IconMapPin,
    label: "Local visibility",
    caption: "Map-pack and search ranking, tracked weekly",
    path: "M2 26c8 2 12-10 20-10s10 14 20 14",
  },
  {
    Icon: IconChat,
    label: "Patient enquiries",
    caption: "Calls, form fills, and messages, all in one place",
    path: "M2 30c8-1 12-18 20-18s10 10 20 6",
  },
  {
    Icon: IconCalendarCheck,
    label: "Booked calls",
    caption: "Enquiries confirmed as appointments",
    path: "M2 28c8 3 12-14 20-14s10 18 20 10",
  },
  {
    Icon: IconStar,
    label: "Review growth",
    caption: "New 5-star reviews, month over month",
    path: "M2 27c8 0 12-12 20-12s10 8 20 2",
  },
];

export default function ReportingDashboard() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="reporting" className="relative overflow-hidden bg-ink text-white">
      <Image
        src="/images/reporting-bg-dashboard.jpg"
        alt=""
        aria-hidden
        fill
        sizes="100vw"
        className="object-cover object-right opacity-60"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-ink from-35% via-ink/85 via-60% to-ink/35"
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink to-transparent" aria-hidden />
      <div className="relative mx-auto max-w-[1200px] px-6 py-20 sm:px-8 sm:py-28">
        <div className="max-w-xl">
          <Eyebrow tone="dark">Your monthly report</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium sm:text-[2.5rem]">
            A clear view of your local growth.
          </h2>
          <p className="mt-5 font-body text-[15.5px] leading-relaxed text-white/65">
            No marketing jargon. Every month you get a plain-English report covering
            the four things that actually matter to your practice.
          </p>
        </div>

        <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3 border-b border-line bg-mist/60 px-6 py-4">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
              <span className="h-2.5 w-2.5 rounded-full bg-line" />
            </span>
            <span className="font-body text-[13.5px] font-medium text-ink">
              Monthly Growth Report
            </span>
            <span className="ml-auto rounded-full bg-white px-3 py-1 font-label text-[10.5px] uppercase tracking-[0.1em] text-slate">
              Sample layout
            </span>
          </div>

          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric, i) => (
              <div key={metric.label} className="bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist text-teal-deep">
                  <metric.Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-body text-[15px] font-semibold text-ink">
                  {metric.label}
                </p>
                <svg viewBox="0 0 64 34" className="mt-3 h-10 w-full text-teal" aria-hidden>
                  <motion.path
                    d={metric.path}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={reduceMotion ? undefined : { pathLength: 0 }}
                    whileInView={reduceMotion ? undefined : { pathLength: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.9, delay: i * 0.1, ease: "easeInOut" }}
                  />
                </svg>
                <p className="mt-2 font-body text-[13px] leading-snug text-slate">
                  {metric.caption}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 font-body text-[13px] text-white/45">
          Illustrative report layout — your actual figures depend on your market and
          starting point.
        </p>
      </div>
    </section>
  );
}
