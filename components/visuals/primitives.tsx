/**
 * Visual system primitives — the building blocks every composition on the
 * site is made from. Pure CSS/SVG (no raster assets, no client JS), so they
 * cost nothing to load, scale to any width and inherit the brand tokens.
 *
 *   VisualFrame  gradient panel with a dot grid and soft glows — the "stage"
 *   Laptop / Phone / Browser  device and window chrome for mockups
 *   FloatCard    elevated card for the small UI fragments layered on a stage
 *   Bar / Chip   skeleton text and pill labels for believable mock UI
 *
 * Everything drawn here is decorative and illustrative: numbers are sample
 * values, never client results, and each stage is `aria-hidden` unless the
 * caller gives it an accessible label.
 */

import type { CSSProperties, ReactNode } from "react";

export type FrameTone = "light" | "dark" | "soft";

const FRAME_BG: Record<FrameTone, string> = {
  light: "linear-gradient(135deg, #e8eff9 0%, #eff4f5 42%, #ffffff 100%)",
  soft: "linear-gradient(160deg, #ffffff 0%, #eff4f5 60%, #e8eff9 100%)",
  dark: "linear-gradient(135deg, #1e3560 0%, #2b4a7d 55%, #26437a 100%)",
};

export function VisualFrame({
  children,
  tone = "light",
  className = "",
  label,
  glow = true,
  style,
  flush = false,
}: {
  children: ReactNode;
  tone?: FrameTone;
  className?: string;
  /** Accessible description of the composition; omit for purely decorative stages. */
  label?: string;
  glow?: boolean;
  style?: CSSProperties;
  /** Flush inside a card: no rounding or outer border, just a bottom hairline. */
  flush?: boolean;
}) {
  const dark = tone === "dark";
  const shape = flush ? "border-b" : "rounded-[var(--radius-xl)] border";
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`relative overflow-hidden ${shape} ${dark ? "band-dark border-white/10" : "border-border-subtle"} ${className}`}
      style={{ background: FRAME_BG[tone], ...style }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, ${dark ? "rgba(255,255,255,0.10)" : "rgba(45,44,43,0.09)"} 1px, transparent 0)`,
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.9), rgba(0,0,0,0.35))",
        }}
      />
      {glow && (
        <>
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ background: dark ? "rgba(59,103,178,0.28)" : "rgba(59,103,178,0.16)" }} />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-64 w-64 rounded-full blur-3xl" style={{ background: dark ? "rgba(59,162,179,0.22)" : "rgba(59,162,179,0.16)" }} />
        </>
      )}
      <div className="relative h-full w-full">{children}</div>
    </div>
  );
}

/** Laptop with a dark bezel and a base; children fill the screen. */
export function Laptop({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full ${className}`}>
      <div className="rounded-[14px] border-[6px] border-[#1e3560] bg-[#1e3560] shadow-[0_24px_60px_-20px_rgba(30,53,96,0.45)]">
        <div className="relative overflow-hidden rounded-[8px] bg-white">{children}</div>
      </div>
      <div className="mx-auto h-3 w-[104%] -translate-x-[2%] rounded-b-[10px] border-t border-[#55524f] bg-gradient-to-b from-[#3f3d3b] to-[#1e3560] shadow-[0_10px_20px_-10px_rgba(30,53,96,0.5)]">
        <div className="mx-auto h-1 w-16 rounded-b bg-[#1f1e1d]" />
      </div>
    </div>
  );
}

/** Phone with a rounded bezel and a notch; children fill the screen. */
export function Phone({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-36 rounded-[26px] border-[5px] border-[#1e3560] bg-[#1e3560] shadow-[0_24px_50px_-18px_rgba(30,53,96,0.5)] ${className}`}>
      <div className="relative overflow-hidden rounded-[21px] bg-white">
        <div className="absolute left-1/2 top-1.5 z-10 h-3 w-14 -translate-x-1/2 rounded-full bg-[#1e3560]" />
        {children}
      </div>
    </div>
  );
}

/** Browser window chrome (three dots + address pill). */
export function Browser({ children, url = "yourpractice.ca", className = "", tone = "light" }: { children: ReactNode; url?: string; className?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <div className={`overflow-hidden rounded-[12px] border ${dark ? "border-white/10 bg-[#2b4a7d]" : "border-border bg-white"} shadow-[0_24px_60px_-24px_rgba(30,53,96,0.4)] ${className}`}>
      <div className={`flex items-center gap-2 border-b px-3 py-2 ${dark ? "border-white/10" : "border-border-subtle bg-[#eff4f5]"}`}>
        <span className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
          <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
          <span className="h-2 w-2 rounded-full bg-[#28c840]" />
        </span>
        <span className={`ml-2 flex h-5 flex-1 items-center rounded-md px-2 text-[9px] ${dark ? "bg-white/10 text-white/70" : "bg-white text-[#607379]"}`}>{url}</span>
      </div>
      {children}
    </div>
  );
}

/** Elevated card for floating UI fragments. Positioned by the caller. */
export function FloatCard({ children, className = "", tone = "light", style }: { children: ReactNode; className?: string; tone?: "light" | "dark"; style?: CSSProperties }) {
  return (
    <div
      className={`rounded-[var(--radius-medium)] border p-3 shadow-[0_18px_40px_-18px_rgba(30,53,96,0.35)] ${tone === "dark" ? "border-white/10 bg-[#2b4a7d] text-white" : "border-border bg-white text-[#1e3560]"} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

/** Skeleton text bar. `w` is any Tailwind width class. */
export function Bar({ w = "w-full", h = "h-1.5", className = "", tone = "muted" }: { w?: string; h?: string; className?: string; tone?: "muted" | "ink" | "accent" | "faint" }) {
  const bg = tone === "ink" ? "bg-[#1e3560]" : tone === "accent" ? "bg-[#3b67b2]" : tone === "faint" ? "bg-[#dce4e6]" : "bg-[#dce4e6]";
  return <span className={`block rounded-full ${bg} ${w} ${h} ${className}`} />;
}

export function Chip({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: "neutral" | "accent" | "good" | "warn" | "dark"; className?: string }) {
  const look = {
    neutral: "bg-[#e9eff1] text-[#485d66]",
    accent: "bg-[#e8eff9] text-[#2f5391]",
    good: "bg-[#e4f4ee] text-[#1f6b52]",
    warn: "bg-[#fbf2e4] text-[#8d5309]",
    dark: "bg-[#1e3560] text-white",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold leading-none ${look} ${className}`}>{children}</span>;
}

/** Tiny "sample data" tag — every mock that shows a number carries one. */
export function SampleTag({ className = "" }: { className?: string }) {
  return <span className={`inline-block rounded-full border border-[#dce4e6] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.12em] text-[#607379] ${className}`}>Sample</span>;
}

export function Stars({ n = 5, className = "h-2.5 w-2.5" }: { n?: number; className?: string }) {
  return (
    <span className="inline-flex gap-px text-[#f5a623]" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} viewBox="0 0 20 20" className={className} fill="currentColor">
          <path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L10 14.9l-5.3 2.8 1.1-5.9L1.5 7.7l5.9-.8z" />
        </svg>
      ))}
    </span>
  );
}
