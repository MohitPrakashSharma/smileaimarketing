"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValueEvent, useReducedMotion } from "motion/react";
import Eyebrow from "@/components/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";

/**
 * "Our approach" as a vertical timeline. A rail runs down the left of the
 * steps; as the visitor scrolls, a pink marker travels along it and the rail
 * fills behind it, and each step lights up as the marker reaches it. The
 * intro copy stays pinned beside the steps on large screens. Reduced motion:
 * the marker still follows the scroll position (it is position, not motion),
 * only the spring smoothing is dropped.
 */

export type ApproachStep = { title: string; detail: string };

export default function ApproachTimeline({ steps, eyebrow, heading, intro }: { steps: ApproachStep[]; eyebrow: string; heading: string; intro?: string }) {
  const reduced = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);
  const lastDotRef = useRef<HTMLSpanElement>(null);
  const [railBottom, setRailBottom] = useState("1.5rem");

  // The rail ends at the centre of the last step's number, not at the bottom of its card.
  useLayoutEffect(() => {
    const ol = listRef.current;
    const dot = lastDotRef.current;
    if (!ol || !dot) return;
    const measure = () => {
      const o = ol.getBoundingClientRect();
      const d = dot.getBoundingClientRect();
      setRailBottom(`${Math.max(0, o.bottom - (d.top + d.height / 2))}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ol);
    return () => ro.disconnect();
  }, []);

  // 0 → 1 as the list passes a line ~58% down the viewport, so the marker sits where the eye is.
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 0.58", "end 0.58"] });
  const progress = useSpring(scrollYProgress, reduced ? { stiffness: 1000, damping: 100 } : { stiffness: 140, damping: 26, mass: 0.4 });
  const fill = useTransform(progress, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);
  const markerTop = fill;
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // The step whose marker position has been reached; slightly early so it lights as the dot arrives.
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(v * (steps.length - 1) + 0.15)));
    setActive(idx);
  });

  return (
    <section className="container-site section-space">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-[calc(var(--header-height)+2.5rem)] lg:self-start">
          <Reveal>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">{heading}</h2>
            {intro && <p className="mt-4 max-w-md text-body-large text-muted-foreground">{intro}</p>}
          </Reveal>
        </div>

        <ol ref={listRef} className="relative">
          {/* Rail: grey track, pink fill and the travelling marker (all sized relative to the rail) */}
          <div className="absolute left-6 top-6 w-px bg-border" style={{ bottom: railBottom }} aria-hidden>
            <motion.div className="absolute left-0 top-0 w-px bg-primary" style={{ height: fill }} />
            <motion.div
              // Big enough to cover a step's number as it passes over it, without swamping the rail.
              className="absolute left-1/2 z-20 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_5px_rgba(59,103,178,0.16),0_4px_14px_rgba(59,103,178,0.45)]"
              style={{ top: markerTop }}
            />
          </div>

          {steps.map((step, i) => {
            const lit = i <= active;
            return (
              <li key={step.title} className="relative flex items-start gap-5 pb-10 last:pb-0 sm:gap-7">
                <span
                  ref={i === steps.length - 1 ? lastDotRef : undefined}
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border font-display text-[0.9375rem] font-semibold ring-4 ring-[var(--color-background)] transition-[background-color,color,border-color,transform,box-shadow] duration-[var(--duration-slow)] ease-[var(--ease-out)] ${
                    lit ? "border-primary bg-primary text-white shadow-md" : "border-border bg-surface text-muted-foreground"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Reveal delay={0.05} className="min-w-0 flex-1">
                  <div className={`card-gradient p-5 transition-opacity duration-[var(--duration-slow)] sm:p-6 ${lit ? "opacity-100" : "opacity-70"}`}>
                    <p className="text-eyebrow text-muted-foreground">Step {i + 1} of {steps.length}</p>
                    <h3 className="mt-2 text-heading-4 text-foreground">{step.title}</h3>
                    <p className="mt-2 text-body-small text-muted-foreground">{step.detail}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
