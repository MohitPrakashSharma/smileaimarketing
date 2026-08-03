"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { IconSearch, IconMapPin, IconChat, IconCalendarCheck, IconTrendingUp } from "@/components/icons";
import Eyebrow from "@/components/Eyebrow";

const FLOW = [
  { label: "Google Search", Icon: IconSearch },
  { label: "Clinic Found", Icon: IconMapPin },
  { label: "Patient Enquiry", Icon: IconChat },
  { label: "Appointment Booked", Icon: IconCalendarCheck },
];

export default function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="top" className="pt-14 pb-16 sm:pt-20 sm:pb-24">
      <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-6 sm:px-8 lg:grid-cols-[55%_45%] lg:gap-10">
        <div>
          <Eyebrow>Marketing built only for dental clinics</Eyebrow>
          <h1 className="mt-5 font-display text-[2.6rem] leading-[1.08] font-medium text-ink sm:text-[3.4rem] lg:text-[3.75rem]">
            More local patients.
            <br />
            <span className="text-teal-deep">Fewer empty chairs.</span>
          </h1>
          <p className="mt-6 max-w-lg font-body text-lg leading-relaxed text-slate">
            We help dental clinics improve their local visibility, generate
            qualified patient enquiries, and turn more searches into booked
            appointments.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#contact"
              className="rounded-full bg-teal px-8 py-4 font-body text-base font-semibold text-ink shadow-[0_14px_34px_-14px_rgba(14,170,155,0.55)] transition-colors hover:bg-teal-deep hover:text-white"
            >
              Get Your Free Growth Plan
            </a>
            <a
              href="#how-it-works"
              className="rounded-full border border-line bg-white px-8 py-4 font-body text-base font-semibold text-ink transition-colors hover:border-teal hover:text-teal-deep"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-6 font-body text-[14.5px] text-slate">
            Dental-only marketing <span className="mx-2 text-line" aria-hidden>·</span>
            No long-term contracts <span className="mx-2 text-line" aria-hidden>·</span>
            Human-reviewed campaigns
          </p>
        </div>

        <div>
          <div className="relative">
            <div className="relative aspect-[6/5] overflow-hidden rounded-3xl shadow-[0_30px_60px_-25px_rgba(8,44,58,0.35)]">
              <Image
                src="/images/hero-search-analytics.jpg"
                alt="Local search and traffic analytics reviewed on a tablet"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 90vw"
                className="object-cover"
              />
            </div>

            <motion.div
              className="absolute -bottom-5 -left-4 flex items-center gap-2.5 rounded-xl border border-line bg-white py-3 pl-3.5 pr-4 shadow-[0_16px_32px_-12px_rgba(8,44,58,0.3)] sm:-left-6"
              initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal-deep">
                <IconTrendingUp className="h-4 w-4" />
              </span>
              <p className="font-body text-[12.5px] font-medium leading-tight text-ink">
                Search visibility
                <br />
                <span className="text-slate">tracked weekly</span>
              </p>
            </motion.div>
          </div>

          <div className="relative mt-8 rounded-2xl border border-line bg-white px-5 py-5">
            <div
              aria-hidden
              className="absolute left-[15%] right-[15%] top-[34px] h-px border-t border-dashed border-line"
            />
            <div className="relative flex items-start justify-between gap-1">
              {FLOW.map((step, i) => (
                <motion.div
                  key={step.label}
                  className="flex flex-1 flex-col items-center text-center"
                  initial={reduceMotion ? undefined : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.12 }}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      i === FLOW.length - 1 ? "bg-coral/10 text-coral" : "bg-mist text-teal-deep"
                    }`}
                  >
                    <step.Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-2 font-body text-[11.5px] font-medium leading-tight text-ink">
                    {step.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
