"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Scroll-driven arc showcase. Six instrument cards travel along a half-circle
 * around the centre copy — in from the bottom-left, over the top, out to the
 * bottom-right — with progress scrubbed to the scroll position. Whichever
 * card is closest to the apex decides which of the six messages is shown.
 *
 * Everything editable lives in ARC_ITEMS: swap an image path or a line of copy
 * and the section updates; the motion is derived from the array length.
 */
export type ArcItem = {
  eyebrow: string;
  headline: string;
  paragraph: string;
  image: string;
  alt: string;
};

export const ARC_ITEMS: ArcItem[] = [
  {
    eyebrow: "Dental Growth",
    headline: "Attract More High-Value Patients",
    paragraph: "Turn your dental website into a patient acquisition engine with stronger branding, trust, and conversion-focused design.",
    image: "/images/tools/tool-mirror.jpg",
    alt: "Dental mirror on a soft teal background",
  },
  {
    eyebrow: "Local Visibility",
    headline: "Get Found in Your Area",
    paragraph: "Improve local discoverability so nearby patients can find your clinic faster through SEO, maps, and targeted content.",
    image: "/images/tools/tool-explorer.jpg",
    alt: "Dental explorer and mirror laid out on a neutral surface",
  },
  {
    eyebrow: "Better Conversions",
    headline: "Convert Visitors into Booked Appointments",
    paragraph: "Use strategic layouts, messaging, and calls to action that guide visitors from interest to consultation.",
    image: "/images/tools/tool-scaler.jpg",
    alt: "Dental scaler and mirror on a textured grey cloth",
  },
  {
    eyebrow: "Premium Branding",
    headline: "Build a Practice Patients Remember",
    paragraph: "Create a polished digital presence that reflects professionalism, care, and a premium patient experience.",
    image: "/images/tools/tool-handpiece.jpg",
    alt: "Dental handpieces resting on a delivery unit",
  },
  {
    eyebrow: "Patient Trust",
    headline: "Increase Credibility Through Better Presentation",
    paragraph: "Showcase treatments, technology, and patient benefits in a way that builds confidence and reduces hesitation.",
    image: "/images/tools/tool-forceps.jpg",
    alt: "Dental forceps and instruments on a sterile blue drape",
  },
  {
    eyebrow: "Sustainable Growth",
    headline: "Scale Your Dental Business with Smarter Marketing",
    paragraph: "Combine design, content, and digital strategy to generate steady patient demand and long-term brand growth.",
    image: "/images/tools/tool-syringe.jpg",
    alt: "Dental syringe and instruments on a blue surface",
  },
];

/* ---------- Motion model ----------
 * Angles are degrees on a circle centred on the stage. 90° is the apex (top);
 * items start at ENTER (bottom-left), and leave at EXIT (bottom-right).
 * Consecutive items are GAP degrees apart along the path, so item i sits at
 *   angle_i(u) = ENTER - u * SPAN + i * GAP
 * where u is the scroll progress 0→1 and SPAN covers every item's full trip.
 */
const ENTER = 200;
const EXIT = -20;
const GAP = 40;
const APEX = 90;
const N = ARC_ITEMS.length;
const SPAN = ENTER - EXIT + (N - 1) * GAP;

const angleOf = (i: number, u: number) => ENTER - u * SPAN + i * GAP;
/** Which item is nearest the apex at progress u. */
const activeAt = (u: number) => Math.min(N - 1, Math.max(0, Math.round((ENTER - APEX - u * SPAN) / -GAP)));
/** Scroll distance the section pins for — one viewport per item plus a little lead in/out. */
const SCROLL_PER_ITEM = 0.8; // viewport heights

export default function ArcShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const guideRef = useRef<SVGCircleElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useLayoutEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!section || !stage || !frame) return;

    gsap.registerPlugin(ScrollTrigger);

    const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    const setters = items.map((el) => ({
      x: gsap.quickSetter(el, "x", "px"),
      y: gsap.quickSetter(el, "y", "px"),
      scale: gsap.quickSetter(el, "scale"),
      opacity: gsap.quickSetter(el, "opacity"),
    }));

    let radius = 0;
    let cx = 0;
    let cy = 0;
    const measure = () => {
      const w = frame.clientWidth;
      const h = frame.clientHeight;
      // Radius: wide enough to orbit the copy, never wider than the stage, and
      // low enough that the apex card (scaled up) clears the top edge
      // On phones the copy is wider than any circle that fits, so the arc sits
      // in the top part of the stage and the copy reads below its horizon.
      const narrow = w < 640;
      cx = w / 2;
      cy = narrow ? h * 0.36 : h * 0.58;
      const cardHalf = (items[0]?.offsetHeight ?? 0) * 0.56;
      radius = Math.min(w * (narrow ? 0.46 : 0.42), cy - cardHalf - 20, 520);
      // Keep the dashed guide on exactly the path the cards ride
      guideRef.current?.setAttribute("cx", String(cx));
      guideRef.current?.setAttribute("cy", String(cy));
      guideRef.current?.setAttribute("r", String(radius));
    };

    let lastActive = -1;
    const render = (u: number) => {
      const rad = Math.PI / 180;
      items.forEach((el, i) => {
        const a = angleOf(i, u);
        const visible = a <= ENTER + 8 && a >= EXIT - 8;
        if (!visible) {
          setters[i].opacity(0);
          return;
        }
        const t = a * rad;
        const x = cx + radius * Math.cos(t) - el.offsetWidth / 2;
        const y = cy - radius * Math.sin(t) - el.offsetHeight / 2;
        // Emphasis peaks at the apex: bigger, fully opaque, in front
        const lift = Math.max(0, Math.sin(t)); // 1 at top, 0 at the horizon
        const edge = Math.min(1, Math.max(0, (Math.min(a - EXIT, ENTER - a)) / 30)); // fade over the last 30°
        setters[i].x(x);
        setters[i].y(y);
        setters[i].scale(0.78 + lift * 0.34);
        setters[i].opacity(edge * (0.55 + lift * 0.45));
        el.style.zIndex = String(10 + Math.round(lift * 10));
      });
      const idx = activeAt(u);
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
    };

    const ctx = gsap.context(() => {
      measure();
      render(0);
      ScrollTrigger.create({
        trigger: section,
        // Pin just under the sticky site header
        start: () => `top ${document.querySelector("header")?.getBoundingClientRect().height ?? 0}px`,
        end: () => `+=${Math.round(window.innerHeight * SCROLL_PER_ITEM * N)}`,
        pin: stage,
        pinSpacing: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onRefresh: () => measure(),
        onUpdate: (self) => render(self.progress),
      });
    }, section);

    return () => ctx.revert();
  }, [reduced]);

  const current = ARC_ITEMS[active];

  return (
    <section
      ref={sectionRef}
      id="arc"
      className="relative isolate overflow-hidden border-t border-border-subtle bg-background-alt"
      aria-label="How we grow dental practices"
    >
      {/* Pinned stage — light, with the soft brand glows behind the arc */}
      <div ref={stageRef} className="relative h-[calc(100svh-var(--header-height))] min-h-[36rem] overflow-hidden">
        {/* 70% frame: the arc and the copy live in here */}
        <div ref={frameRef} className="relative mx-auto h-full w-full lg:w-[70vw]">
          {/* Faint guide arc */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="arc-stroke" x1="0" x2="1">
                <stop offset="0" stopColor="#3b67b2" stopOpacity="0" />
                <stop offset="0.5" stopColor="#3b67b2" stopOpacity="0.4" />
                <stop offset="1" stopColor="#3ba2b3" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle
              ref={guideRef}
              cx="50%"
              cy="58%"
              r="0"
              fill="none"
              stroke="url(#arc-stroke)"
              strokeWidth="1.5"
              strokeDasharray="4 10"
              strokeLinecap="round"
            />
          </svg>

          {/* Orbiting instrument cards — same frosted card language as the video band */}
          {ARC_ITEMS.map((item, i) => (
            <div
              key={item.image}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className={`absolute left-0 top-0 h-20 w-20 rounded-[22px] border border-white/80 bg-white/60 p-1.5 shadow-[0_24px_50px_-20px_rgba(30,53,96,0.3)] backdrop-blur-md will-change-transform sm:h-28 sm:w-28 lg:h-36 lg:w-36 ${
                reduced ? "" : "opacity-0"
              }`}
              style={reduced ? staticPosition(i) : undefined}
              aria-hidden={!reduced}
            >
              <div className="relative h-full w-full overflow-hidden rounded-[16px]">
                <Image src={item.image} alt={reduced ? item.alt : ""} fill sizes="(min-width: 1024px) 144px, (min-width: 640px) 112px, 80px" className="object-cover" quality={80} />
              </div>
            </div>
          ))}

          {/* Centre copy — swaps as the apex card changes */}
          <div className="absolute inset-x-0 top-[66%] z-20 -translate-y-1/2 px-[var(--page-gutter)] sm:top-[58%]">
            <div
              key={active}
              className="arc-copy mx-auto max-w-lg rounded-[var(--radius-xl)] border border-white/80 bg-white/55 px-6 py-6 text-center shadow-[0_28px_60px_-32px_rgba(30,53,96,0.25)] backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)] sm:px-9 sm:py-8"
            >
              <span className="text-eyebrow text-primary-ink">{current.eyebrow}</span>
              <h2 className="mt-3 font-display text-[1.625rem] font-bold leading-[1.15] tracking-[-0.02em] text-foreground sm:text-heading-2">{current.headline}</h2>
              <p className="mt-3 text-body-small text-muted-foreground sm:text-body">{current.paragraph}</p>
              <ButtonLink href="#opportunity" size="sm" arrow className="mt-5">
                Check How Much Money You Are Losing
              </ButtonLink>
            </div>
          </div>

          {/* Progress dots */}
          {!reduced && (
            <ol className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-2" aria-label="Progress">
              {ARC_ITEMS.map((item, i) => (
                <li
                  key={item.headline}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-[var(--duration-normal)] ${i === active ? "w-6 bg-[image:var(--color-accent-gradient)]" : "w-1.5 bg-border-strong"}`}
                  aria-current={i === active ? "step" : undefined}
                />
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Reduced motion: every message, readable without scrolling tricks */}
      {reduced && (
        <ol className="container-site grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {ARC_ITEMS.map((item) => (
            <li key={item.headline} className="rounded-[var(--radius-large)] border border-white/80 bg-white/60 p-6 backdrop-blur-md">
              <span className="text-eyebrow text-primary-ink">{item.eyebrow}</span>
              <h3 className="mt-3 text-heading-4 text-foreground">{item.headline}</h3>
              <p className="mt-2 text-body-small text-muted-foreground">{item.paragraph}</p>
            </li>
          ))}
        </ol>
      )}
      {reduced && (
        <div className="container-site pb-16 text-center">
          <ButtonLink href="#opportunity" arrow>
            Check How Much Money You Are Losing
          </ButtonLink>
        </div>
      )}
    </section>
  );
}

/** Static arc placement used when motion is reduced: cards spread evenly over the top half. */
function staticPosition(i: number): React.CSSProperties {
  const a = (ENTER - 20 - (i * (ENTER - 20 - (EXIT + 20))) / (N - 1)) * (Math.PI / 180);
  return {
    left: `calc(50% + ${Math.cos(a) * 40}vmin - 2.5rem)`,
    top: `calc(58% - ${Math.sin(a) * 40}vmin - 2.5rem)`,
  };
}
