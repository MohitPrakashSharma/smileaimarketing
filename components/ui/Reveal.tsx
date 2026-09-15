"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, MotionConfig, useInView, useMotionValue, useTransform, useReducedMotion, animate, type Variants } from "motion/react";

/** Motion tokens — mirror --duration-* / --ease-out in globals.css. */
export const MOTION = {
  duration: { fast: 0.15, normal: 0.25, slow: 0.45 },
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: MOTION.duration.slow, ease: MOTION.ease } },
};

/** Variant used when the visitor prefers reduced motion: no movement, instant. */
const still: Variants = { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } };

export const revealItem = fadeUp;

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

/** Fades + rises a single element into view once, on scroll. */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={reduced ? still : fadeUp}
      transition={{ delay, duration: MOTION.duration.slow, ease: MOTION.ease }}
    >
      {children}
    </motion.div>
  );
}

type RevealGroupProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
};

/** Wrap a set of `motion.* variants={revealItem}` children to stagger them in on scroll. */
export function RevealGroup({ children, className, stagger = 0.12 }: RevealGroupProps) {
  const reduced = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : stagger } } }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

type AnimatedCounterProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
};

/** Counts up to `value` once it scrolls into view. */
export function AnimatedCounter({ value, prefix = "", suffix = "", className }: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionValue, value, { duration: reduced ? 0 : 1.1, ease: MOTION.ease });
    return () => controls.stop();
  }, [isInView, value, motionValue, reduced]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export { motion };
