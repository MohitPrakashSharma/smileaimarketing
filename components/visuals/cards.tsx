import Image from "next/image";
import { IconMapPin, IconSearch, IconPhoneWave, IconCheck } from "@/components/icons";
import { Bar, Chip, FloatCard, SampleTag, Stars } from "./primitives";

/**
 * Reusable mock-UI fragments: what the floating cards on the stages show.
 * Sample values only — a fictional practice ("Maple Grove Dental") and
 * illustrative figures, labelled as such wherever a number appears.
 */

export const MOCK_PRACTICE = "Maple Grove Dental";

/** Local-pack style ranking list. */
export function RankCard({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const rows = [
    { name: "Willow Family Dentistry", dist: "1.9 km", rating: "4.7", reviews: 148, you: false },
    { name: MOCK_PRACTICE, dist: "0.8 km", rating: "4.9", reviews: 212, you: true },
    { name: "Northside Dental Centre", dist: "2.4 km", rating: "4.6", reviews: 96, you: false },
  ];
  return (
    <FloatCard className={`w-64 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#4a4948]">
          <IconSearch className="h-3 w-3 text-[#d81b6a]" />
          dentist near me
        </span>
        <SampleTag />
      </div>
      <ul className="mt-2 divide-y divide-[#f0eee9]">
        {rows.slice(0, compact ? 2 : 3).map((r, i) => (
          <li key={r.name} className={`flex items-center gap-2 py-1.5 ${r.you ? "-mx-1.5 rounded-md bg-[#fde9f1]/70 px-1.5" : ""}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${r.you ? "bg-[#d81b6a] text-white" : "bg-[#f3f1ee] text-[#6b6a70]"}`}>{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[10px] font-semibold text-[#2d2c2b]">{r.name}</span>
              <span className="flex items-center gap-1 text-[8px] text-[#6b6a70]">
                <Stars className="h-2 w-2" /> {r.rating} ({r.reviews}) · {r.dist}
              </span>
            </span>
            {r.you && <Chip tone="accent">You</Chip>}
          </li>
        ))}
      </ul>
    </FloatCard>
  );
}

/** "New appointment request" notification. */
export function EnquiryCard({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <FloatCard tone={tone} className={`w-56 ${className}`}>
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fde9f1] text-[#d81b6a]">
          <IconPhoneWave className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold">New appointment request</span>
            <span className={`text-[8px] ${tone === "dark" ? "text-white/60" : "text-[#8e8c94]"}`}>2 min ago</span>
          </span>
          <span className={`mt-0.5 block text-[9px] ${tone === "dark" ? "text-white/70" : "text-[#6b6a70]"}`}>Invisalign consultation · from your website</span>
          <span className="mt-2 flex gap-1.5">
            <Chip tone="accent">Call back</Chip>
            <Chip tone={tone === "dark" ? "dark" : "neutral"}>Mobile</Chip>
          </span>
        </span>
      </div>
    </FloatCard>
  );
}

/** Semicircular speed gauge with a value. */
export function SpeedGauge({ value = 92, label = "Mobile performance", size = 120, className = "" }: { value?: number; label?: string; size?: number; className?: string }) {
  const r = 44;
  const c = Math.PI * r; // half circumference
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const color = value >= 90 ? "#1e7a3a" : value >= 50 ? "#c46a00" : "#c62828";
  return (
    <div className={`flex flex-col items-center ${className}`} style={{ width: size }}>
      <svg viewBox="0 0 100 58" width={size} height={size * 0.58} aria-hidden>
        <path d="M6 52 A44 44 0 0 1 94 52" fill="none" stroke="#ece9e4" strokeWidth="8" strokeLinecap="round" />
        <path d="M6 52 A44 44 0 0 1 94 52" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
        <text x="50" y="50" textAnchor="middle" fontSize="22" fontWeight="700" fill="#2d2c2b" fontFamily="var(--font-outfit), sans-serif">
          {value}
        </text>
      </svg>
      <span className="-mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#6b6a70]">{label}</span>
    </div>
  );
}

/** Metric with label, value and pass/warn indicator. */
export function MetricRow({ label, value, ok = true }: { label: string; value: string; ok?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5 text-[10px]">
      <span className="text-[#4a4948]">{label}</span>
      <span className="flex items-center gap-1.5 font-semibold text-[#2d2c2b]">
        {value}
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-[#1e7a3a]" : "bg-[#c46a00]"}`} />
      </span>
    </li>
  );
}

export function StatCard({ label, value, delta, className = "", tone = "light" }: { label: string; value: string; delta?: string; className?: string; tone?: "light" | "dark" }) {
  return (
    <FloatCard tone={tone} className={`w-40 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${tone === "dark" ? "text-white/60" : "text-[#6b6a70]"}`}>{label}</span>
        <SampleTag />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-[1.375rem] font-bold leading-none tracking-[-0.02em]">{value}</span>
        {delta && <Chip tone="good">{delta}</Chip>}
      </div>
      <div className="mt-2 flex h-6 items-end gap-0.5" aria-hidden>
        {[30, 45, 38, 55, 60, 52, 70, 78, 74, 88].map((h, i) => (
          <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: i >= 8 ? "#d81b6a" : tone === "dark" ? "rgba(255,255,255,0.28)" : "#e9e6e0" }} />
        ))}
      </div>
    </FloatCard>
  );
}

/** Google Business Profile style summary. */
export function ProfileCard({ className = "" }: { className?: string }) {
  return (
    <FloatCard className={`w-52 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2d2c2b] font-display text-[11px] font-bold text-white">MG</span>
        <span className="min-w-0">
          <span className="block truncate text-[10px] font-semibold text-[#2d2c2b]">{MOCK_PRACTICE}</span>
          <span className="flex items-center gap-1 text-[8px] text-[#6b6a70]">
            4.9 <Stars className="h-2 w-2" /> 212 reviews
          </span>
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-[9px] text-[#4a4948]">
        {["Open today · 8 a.m.–6 p.m.", "Dentist · Newmarket, ON", "Services, photos and hours complete"].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <IconCheck className="h-2.5 w-2.5 text-[#1e7a3a]" />
            {t}
          </li>
        ))}
      </ul>
    </FloatCard>
  );
}

/**
 * The mock dental website used inside device frames. Real (fictional) words
 * rather than skeleton bars so the mockup reads as a finished site; the only
 * photo on the site appears here as a small thumbnail for dental context.
 */
export function MockSite({ variant = "desktop", photo = true }: { variant?: "desktop" | "mobile"; photo?: boolean }) {
  if (variant === "mobile") {
    return (
      <div className="bg-white pt-5" aria-hidden>
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-display text-[9px] font-bold text-[#2d2c2b]">{MOCK_PRACTICE}</span>
          <span className="rounded-full bg-[#d81b6a] px-2 py-0.5 text-[7px] font-semibold text-white">Book</span>
        </div>
        <div className="px-3 pb-3">
          <p className="font-display text-[12px] font-bold leading-tight text-[#2d2c2b]">Gentle family dentistry in Newmarket</p>
          <p className="mt-1 text-[7px] leading-snug text-[#6b6a70]">New patients welcome. Same-week appointments for check-ups and emergencies.</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-full bg-[#d81b6a] px-2 py-1 text-[7px] font-semibold text-white">Book an appointment</span>
            <span className="rounded-full border border-[#e6e4e1] px-2 py-1 text-[7px] font-semibold text-[#2d2c2b]">Call</span>
          </div>
          {photo && (
            <div className="relative mt-2 h-14 overflow-hidden rounded-lg bg-[#f3f1ee]">
              <Image src="/images/dental-operatory-calm.jpg" alt="" fill sizes="140px" className="object-cover" quality={60} />
            </div>
          )}
          <div className="mt-2 grid grid-cols-3 gap-1">
            {["Check-ups", "Invisalign", "Kids"].map((s) => (
              <span key={s} className="rounded-md bg-[#f7f6f4] px-1 py-1.5 text-center text-[6.5px] font-semibold text-[#2d2c2b]">{s}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-white" aria-hidden>
      <div className="flex items-center justify-between border-b border-[#f0eee9] px-4 py-2">
        <span className="font-display text-[10px] font-bold text-[#2d2c2b]">{MOCK_PRACTICE}</span>
        <span className="hidden gap-3 text-[7.5px] font-medium text-[#4a4948] sm:flex">
          <span>Services</span>
          <span>New patients</span>
          <span>About</span>
          <span>Contact</span>
        </span>
        <span className="rounded-full bg-[#d81b6a] px-2 py-0.5 text-[7.5px] font-semibold text-white">Book online</span>
      </div>
      <div className="grid grid-cols-[1.1fr_0.9fr] gap-3 px-4 py-3">
        <div>
          <span className="inline-block rounded-full bg-[#fde9f1] px-1.5 py-0.5 text-[6.5px] font-semibold uppercase tracking-wider text-[#a9134f]">New patients welcome</span>
          <p className="mt-1.5 font-display text-[15px] font-bold leading-[1.1] text-[#2d2c2b]">Gentle family dentistry in Newmarket</p>
          <p className="mt-1.5 text-[7.5px] leading-snug text-[#6b6a70]">Check-ups, Invisalign, children&apos;s dentistry and same-week emergency care — with online booking that takes a minute.</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-full bg-[#d81b6a] px-2 py-1 text-[7.5px] font-semibold text-white">Book an appointment</span>
            <span className="rounded-full border border-[#e6e4e1] px-2 py-1 text-[7.5px] font-semibold text-[#2d2c2b]">Call (905) 555-0142</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[7px] text-[#6b6a70]">
            <Stars className="h-2 w-2" /> 4.9 from 212 Google reviews
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg bg-[#f3f1ee]">
          {photo ? <Image src="/images/dental-operatory-calm.jpg" alt="" fill sizes="(min-width: 1024px) 260px, 40vw" className="object-cover" quality={60} /> : <div className="h-full w-full bg-gradient-to-br from-[#fde9f1] to-[#f7f6f4]" />}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-[#f0eee9] px-4 py-2.5">
        {[
          ["Check-ups & cleanings", "Every six months"],
          ["Invisalign", "Free consultation"],
          ["Children's dentistry", "Ages 1 and up"],
        ].map(([t, d]) => (
          <div key={t} className="rounded-md border border-[#f0eee9] p-1.5">
            <span className="mb-1 block h-4 w-4 rounded-full bg-[#fde9f1]" />
            <span className="block text-[7.5px] font-semibold text-[#2d2c2b]">{t}</span>
            <span className="block text-[6.5px] text-[#8e8c94]">{d}</span>
            <Bar w="w-2/3" h="h-1" className="mt-1" tone="faint" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small map panel: soft roads + pins (SVG), used by the local SEO composition. */
export function MapPanel({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[var(--radius-large)] border border-border bg-[#f4f3ef] ${className}`} aria-hidden>
      <svg viewBox="0 0 320 220" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <rect width="320" height="220" fill="#f4f3ef" />
        <g stroke="#ffffff" strokeWidth="10" strokeLinecap="round" fill="none">
          <path d="M-10 70 C 80 60, 140 90, 330 80" />
          <path d="M40 -10 C 50 80, 30 150, 60 240" />
          <path d="M-10 160 C 100 150, 200 170, 330 150" />
          <path d="M210 -10 C 200 70, 230 130, 215 240" />
          <path d="M120 -10 C 130 60, 110 130, 140 240" />
        </g>
        <g stroke="#e4e1db" strokeWidth="3" fill="none">
          <path d="M-10 115 L330 110" />
          <path d="M270 -10 L280 240" />
        </g>
        <g fill="#d9f0dd">
          <rect x="150" y="20" width="48" height="36" rx="6" />
          <rect x="235" y="165" width="60" height="40" rx="8" />
        </g>
        <g fill="#cfe6f5">
          <path d="M0 200 C 60 190, 90 215, 140 220 L0 220z" />
        </g>
        {[
          [78, 96],
          [236, 70],
          [176, 150],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <ellipse cx="0" cy="12" rx="8" ry="3" fill="rgba(0,0,0,0.12)" />
            <path d="M0 -20 c-8 0 -13 6 -13 13 0 9 13 19 13 19 s13 -10 13 -19c0 -7 -5 -13 -13 -13z" fill={i === 2 ? "#d81b6a" : "#6b6a70"} />
            <circle cx="0" cy="-7" r="4.5" fill="white" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export { IconMapPin };
