"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Eyebrow from "@/components/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { CAPTION_WASH } from "@/components/about/captionWash";

/**
 * "Evidence before assumptions" as a pinned horizontal section: the section is
 * several screens tall, the wrapper sticks, and the panels travel sideways on
 * the section's own view timeline (see `.pin-section` in globals.css).
 *
 * Below 1024px, with reduced motion, or without scroll-driven animation
 * support, the identical panels stack vertically — nothing is hidden behind
 * the effect.
 *
 * The claims here stay inside what an audit actually measures: each panel says
 * what is tested and what it tells us, and the closing panel is explicit about
 * what we will not promise.
 */

/**
 * Falls back to the stacked layout when the browser accepts the scroll-timeline
 * syntax but never drives it — the feature sits behind a flag, so `@supports`
 * alone is not enough to trust it. Without this the track would sit in a row
 * thousands of pixels wide with nothing to move it, and the closing panel and
 * its button would be unreachable.
 *
 * The class is toggled straight on the node rather than through state: there is
 * nothing to re-render, and it keeps this off React's render path.
 */
function usePinnedScrollFallback(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    const track = section.querySelector<HTMLElement>(".pin-track");
    if (!track || typeof track.getAnimations !== "function") return;

    // The check has to wait until the section is actually on screen. Before the
    // view timeline's range begins, a browser that works perfectly well still
    // reports no transform, so probing at mount would condemn it wrongly.
    let settled = false;

    const verdict = () => {
      if (settled) return;
      settled = true;

      // Below the breakpoint, or with reduced motion, no animation is declared
      // and the stack is already what is rendering.
      if (getComputedStyle(track).animationName === "none") return;

      // A timeline that reports a time is not proof: a browser with the feature
      // switched off still attaches one, freezes it, and never applies a value.
      // The animation fills both ways, so once the section is in view a browser
      // that is driving it always has a transform here.
      const attached = track.getAnimations().length > 0;
      const applied = getComputedStyle(track).transform !== "none";
      if (!attached || !applied) section.classList.add("pin-stacked");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        // One frame for the timeline to settle, then decide. The timer is the
        // backstop: requestAnimationFrame never fires in a background tab.
        requestAnimationFrame(verdict);
        window.setTimeout(verdict, 200);
      },
      { rootMargin: "0px 0px -25% 0px" },
    );
    observer.observe(section);

    return () => observer.disconnect();
  }, [ref]);
}

const EVIDENCE = [
  {
    step: "01",
    title: "What your website says about your treatments",
    detail:
      "We read every page the way a search engine does — headings, wording, the links between pages, the images — and compare it with the treatments you want to be known for.",
    tells:
      "Whether someone searching for implants, Invisalign or an emergency appointment finds a page that answers them, or a single line that leaves them guessing.",
  },
  {
    step: "02",
    title: "The technical work patients never see",
    detail:
      "We examine the hidden factors that decide whether Google can understand your practice and whether a visit feels safe and unremarkable: indexing, redirects, structured data, certificates, page weight.",
    tells:
      "Whether your practice can be found and trusted at all. These problems rarely show in a browser, and they quietly hold back everything built on top of them.",
  },
  {
    step: "03",
    title: "Google's numbers, not ours",
    detail:
      "We run Google's own PageSpeed Insights against your live pages, on mobile and desktop, and record what it reports on performance, accessibility, best practice and search basics.",
    tells:
      "How your practice behaves on the phone a patient is actually holding — the device most of them use, and the first impression many of them get.",
  },
  {
    step: "04",
    title: "The path from interested to in touch",
    detail:
      "We follow the route a patient takes — finding your number, understanding what you offer, reaching a way to book — and count what it costs them in taps and in reading.",
    tells:
      "Where an interested patient runs out of patience. It is usually far closer to the booking than most practices expect.",
  },
];

/**
 * How the section is laid out.
 *
 * "stacked" renders the panels as an ordinary vertical stack, which is what
 * this section currently uses. "pinned" restores the horizontal scroll: the
 * wrapper sticks and the track travels sideways on the section's own view
 * timeline. Everything for the pinned version is still in place — flip this
 * and it comes back.
 */
const LAYOUT: "stacked" | "pinned" = "pinned";

function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <article className={`pin-panel shrink-0 ${className}`}>{children}</article>;
}

export default function EvidenceTrack() {
  // Intro + four evidence panels + the photo + the closing panel.
  const panelCount = EVIDENCE.length + 3;
  const sectionRef = useRef<HTMLElement>(null);
  usePinnedScrollFallback(sectionRef);

  return (
    <section
      ref={sectionRef}
      className={`pin-section bg-background ${LAYOUT === "stacked" ? "pin-stacked" : ""}`}
      style={{ "--pin-panels": panelCount } as React.CSSProperties}
      aria-labelledby="evidence-heading"
    >
      <div className="pin-sticky">
        <div className="pin-track">
          {/* Intro */}
          <Panel className="pin-panel-wide flex flex-col justify-center">
            <Eyebrow>Evidence before assumptions</Eyebrow>
            <h2 id="evidence-heading" className="mt-4 text-heading-2 text-foreground">
              We look first. Then we recommend.
            </h2>
            <p className="mt-5 text-body-large text-muted-foreground">
              Most proposals arrive before anyone has looked at the practice. Ours arrive after. We review what a
              patient sees when they go looking for a dentist like you, then show you what we found and what it means
              for your practice — in language you can check for yourself.
            </p>
            {/* Only meaningful while the track travels sideways. */}
            {LAYOUT === "pinned" && (
              <p className="mt-6 hidden items-center gap-3 text-metadata text-muted-foreground lg:flex" aria-hidden>
                <span className="h-px w-8 bg-secondary-mark" />
                Keep scrolling
              </p>
            )}
          </Panel>

          {/* The four measurements */}
          {EVIDENCE.map((item) => (
            <Panel key={item.step} className="card-teal flex flex-col p-7">
              <span className="font-display text-[2.5rem] font-bold leading-none tracking-[-0.02em] text-secondary-ink">
                {item.step}
              </span>
              <h3 className="mt-5 text-heading-4 text-foreground">{item.title}</h3>
              <p className="mt-3 text-body-small text-muted-foreground">{item.detail}</p>
              <p className="mt-auto border-t border-secondary/25 pt-4 text-body-small text-foreground-secondary">
                <span className="text-eyebrow text-secondary-ink">What it tells us</span>
                <span className="mt-2 block">{item.tells}</span>
              </p>
            </Panel>
          ))}

          {/* The photo, kept from the previous layout */}
          <Panel className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] bg-surface-muted">
            <Image
              src="/images/about-evidence-xray.jpg"
              alt="A dentist showing a dental x-ray on a tablet to a patient"
              fill
              sizes="(min-width: 1024px) 26vw, 100vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03] motion-reduce:transition-none"
              quality={80}
            />
            <div className={`${CAPTION_WASH} p-6 pt-28`}>
              <p className="text-eyebrow text-white/85">Show, don&apos;t tell</p>
              <p className="mt-2 text-body-small">
                You would not present a treatment plan without the x-ray in front of you. We hold our recommendations
                to the same standard.
              </p>
            </div>
          </Panel>

          {/* Closing panel: the limits, then the next step */}
          <Panel className="pin-panel-wide card-teal flex flex-col justify-center p-7 sm:p-9">
            <Eyebrow>What we won&apos;t do</Eyebrow>
            <p className="mt-4 text-body-large text-foreground">
              Promise you a ranking, a number of enquiries or a revenue figure.
            </p>
            <p className="mt-3 text-body-small text-muted-foreground">
              Those depend on your market, your competitors and where your practice is starting from — none of which
              any agency controls. What we can do is show you where you stand today and which issues deserve your
              attention first.
            </p>
            <div className="mt-7 border-t border-secondary/25 pt-7">
              <p className="text-heading-4 text-foreground">See what your own website is telling you.</p>
              <p className="mt-2 text-body-small text-muted-foreground">
                It is free, takes a couple of minutes to start and needs no logins or account access. The report is
                yours to keep, whether or not we ever speak.
              </p>
              <ButtonLink href="/free-dental-audit" arrow className="mt-6">
                Get your free website audit
              </ButtonLink>
            </div>
          </Panel>
        </div>
      </div>
    </section>
  );
}
