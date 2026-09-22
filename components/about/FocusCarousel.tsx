"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import { motion, useReducedMotion, type PanInfo } from "motion/react";
import Eyebrow from "@/components/Eyebrow";
import { Reveal, MOTION } from "@/components/ui/Reveal";

/**
 * "What we focus on" as an interactive card scroll: one slide per focus
 * area — a dark text card beside its photo — in a horizontal track with the
 * neighbours peeking in from both sides. Arrows, drag/swipe and the keyboard
 * move between slides; each slide also advances on its own after a few
 * seconds (the thin bar in the text card shows the countdown), pausing while
 * the visitor hovers or focuses it. Reduced motion: no auto-advance, no
 * sliding animation.
 */

export type FocusSlide = { Icon: ComponentType<{ className?: string }>; title: string; detail: string; image: string; alt: string };

const AUTO_MS = 6000;
const GAP = 20;

export default function FocusCarousel({ slides, eyebrow, heading }: { slides: FocusSlide[]; eyebrow: string; heading: string }) {
  const reduced = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0); // bumps to restart the countdown bar after a pause or a manual move
  const count = slides.length;

  // Slide width from the viewport: full width on small screens, ~78% on large so the neighbours peek.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const slideW = width >= 1024 ? Math.round(width * 0.78) : width;
  const offset = (width - slideW) / 2 - index * (slideW + GAP);

  const go = useCallback(
    (to: number) => {
      setIndex(((to % count) + count) % count);
      setRun((r) => r + 1);
    },
    [count],
  );

  // Auto-advance (not under reduced motion, not while paused, not in a hidden tab).
  useEffect(() => {
    if (reduced || paused) return;
    const t = setTimeout(() => {
      if (document.visibilityState !== "hidden") go(index + 1);
      else setRun((r) => r + 1);
    }, AUTO_MS);
    return () => clearTimeout(t);
  }, [index, run, paused, reduced, go]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const threshold = Math.min(120, slideW / 5);
    if (info.offset.x < -threshold || info.velocity.x < -400) go(index + 1);
    else if (info.offset.x > threshold || info.velocity.x > 400) go(index - 1);
    else setRun((r) => r + 1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
  };

  const arrowClass =
    "flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-surface text-foreground shadow-sm transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:border-primary hover:bg-primary hover:text-white hover:shadow-md active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring";

  return (
    <section
      className="band-prism relative overflow-hidden border-y border-border-subtle"
      role="region"
      aria-roledescription="carousel"
      aria-label={heading}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => { setPaused(false); setRun((r) => r + 1); }}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setPaused(false); setRun((r) => r + 1); } }}
      onKeyDown={onKeyDown}
    >
      <div className="container-site section-space">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <Eyebrow>{eyebrow}</Eyebrow>
              <h2 className="mt-4 text-heading-2 text-foreground">{heading}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-metadata tabular-nums text-muted-foreground" aria-live="polite">
                {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
              </span>
              <button type="button" className={arrowClass} onClick={() => go(index - 1)} aria-label="Previous">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M16.5 10h-12M9 5l-4.5 5L9 15" /></svg>
              </button>
              <button type="button" className={arrowClass} onClick={() => go(index + 1)} aria-label="Next">
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3.5 10h12M11 5l4.5 5-4.5 5" /></svg>
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-10">
          <div ref={viewportRef} className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
            <motion.div
              className="flex cursor-grab touch-pan-y active:cursor-grabbing"
              style={{ gap: GAP, width: "max-content" }}
              animate={{ x: offset }}
              transition={reduced ? { duration: 0 } : { duration: 0.7, ease: MOTION.ease }}
              drag={width ? "x" : false}
              dragSnapToOrigin
              dragElastic={0.2}
              onDragEnd={onDragEnd}
            >
              {slides.map((s, i) => {
                const active = i === index;
                return (
                  <motion.article
                    key={s.title}
                    aria-hidden={!active}
                    animate={{ opacity: active ? 1 : 0.45, scale: active ? 1 : 0.965 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.6, ease: MOTION.ease }}
                    style={{ width: slideW || undefined }}
                    className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-4"
                  >
                    {/* Text card on the dark band */}
                    <div className="band-dark relative flex min-h-[18rem] flex-col rounded-[var(--radius-xl)] p-6 sm:min-h-[22rem] sm:p-8">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white">
                        <s.Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-5 text-heading-3 text-white">{s.title}</h3>
                      <p className="mt-auto pt-8 text-body-small text-white/80">{s.detail}</p>
                      <div className="mt-5 h-0.5 w-full overflow-hidden rounded-full bg-white/15" aria-hidden>
                        {active && !reduced && (
                          <div
                            key={`${index}-${run}`}
                            className="h-full rounded-full bg-white"
                            style={{ animation: `focus-progress ${AUTO_MS}ms linear forwards`, animationPlayState: paused ? "paused" : "running" }}
                          />
                        )}
                        {active && reduced && <div className="h-full w-full rounded-full bg-white" />}
                      </div>
                    </div>
                    {/* Photo card */}
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted sm:aspect-auto">
                      <Image
                        src={s.image}
                        alt={s.alt}
                        fill
                        draggable={false}
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="pointer-events-none select-none object-cover"
                        quality={80}
                      />
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
