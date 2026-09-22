import type { ServiceIcon } from "@/lib/services";
import { IconCheck, IconLink, IconFileText, IconSearch, IconCursorClick, IconClipboardCheck } from "@/components/icons";
import { VisualFrame, Laptop, Phone, Browser, FloatCard, Bar, Chip, SampleTag } from "./primitives";
import { MockSite, RankCard, ProfileCard, MapPanel, SpeedGauge, MetricRow, EnquiryCard, StatCard, MOCK_PRACTICE } from "./cards";

/**
 * One composition per service, keyed by the service's icon key so the data
 * file stays the single source of truth. `size="hero"` is the full stage used
 * on service pages and `size="mini"` the compact panel on /services cards.
 * All content is illustrative sample UI.
 */

export type ServiceVisualKey = ServiceIcon;

const LABELS: Record<ServiceVisualKey, string> = {
  layout: "Illustration: a dental practice website shown on a laptop and a phone, with an appointment enquiry notification.",
  mapPin: "Illustration: a local map with pins, a Google Business Profile summary and a 'dentist near me' results list.",
  search: "Illustration: a page-structure panel showing a title tag, meta description, heading outline and on-page checks.",
  gauge: "Illustration: a mobile performance gauge with Core Web Vitals metrics and a diagnostics list.",
  link: "Illustration: a network diagram of local and dental-industry sources linking to a practice website.",
  fileText: "Illustration: a content calendar beside article cards moving from draft to review to published.",
  cursorClick: "Illustration: a landing page with attention hotspots over the call to action, beside a visits-to-enquiries funnel.",
  clipboardCheck: "Illustration: an audit report card with an SEO health score, verified findings and a prioritized action plan.",
};

export function ServiceVisual({ variant, size = "hero", className = "", flush = false }: { variant: ServiceVisualKey; size?: "hero" | "mini"; className?: string; flush?: boolean }) {
  if (size === "mini") return <MiniVisual variant={variant} className={className} flush={flush} />;
  const Comp = HERO[variant];
  return (
    <VisualFrame label={LABELS[variant]} className={`aspect-[4/5] w-full sm:aspect-[5/4] ${className}`}>
      <Comp />
    </VisualFrame>
  );
}

// ───────────────────────────── hero compositions ─────────────────────────────

function WebsiteHero() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <Laptop className="absolute left-4 right-4 top-6 sm:left-8 sm:right-[22%] sm:top-10">
        <MockSite />
      </Laptop>
      <Phone className="absolute bottom-4 right-4 hidden sm:block sm:bottom-6 sm:right-8">
        <MockSite variant="mobile" />
      </Phone>
      <EnquiryCard className="absolute bottom-6 left-4 sm:left-8" />
      <FloatCard className="absolute right-6 top-4 hidden !p-2 sm:block sm:right-10 sm:top-6">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#1e3560]">
          <IconCheck className="h-3 w-3 text-[#1f6b52]" /> Mobile-friendly · tap-to-call
        </span>
      </FloatCard>
    </div>
  );
}

function LocalSeoHero() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <MapPanel className="absolute inset-x-5 top-5 bottom-14 sm:inset-x-8 sm:top-8 sm:bottom-16" />
      <RankCard className="absolute left-3 top-[42%] sm:left-6 sm:top-[40%]" />
      <ProfileCard className="absolute right-3 top-3 hidden sm:block sm:right-6 sm:top-6" />
      <FloatCard className="absolute bottom-4 right-4 hidden !p-2 sm:block sm:bottom-6 sm:right-8">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#1e3560]">
          <IconCheck className="h-3 w-3 text-[#1f6b52]" /> Name, address &amp; phone consistent
        </span>
      </FloatCard>
    </div>
  );
}

function OnPageHero() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <Browser url="yourpractice.ca/invisalign" className="absolute inset-x-5 top-5 sm:inset-x-8 sm:top-8">
        <div className="grid gap-3 p-3 sm:grid-cols-[1fr_0.9fr]">
          <div className="space-y-2">
            <Field label="Title tag" value="Invisalign in Newmarket | Maple Grove Dental" ok />
            <Field label="Meta description" value="Clear aligners for adults and teens. Free consultation, flexible payment plans, evening appointments." ok />
            <div className="rounded-md border border-[#e9eff1] p-2">
              <span className="text-[8px] font-semibold uppercase tracking-wider text-[#607379]">Heading outline</span>
              <ul className="mt-1 space-y-1 text-[9px] text-[#1e3560]">
                <li className="font-semibold">H1 · Invisalign clear aligners</li>
                <li className="pl-3">H2 · Is Invisalign right for you?</li>
                <li className="pl-3">H2 · What to expect</li>
                <li className="pl-6 text-[#4f636b]">H3 · Your first visit</li>
                <li className="pl-3">H2 · Cost and payment plans</li>
              </ul>
            </div>
          </div>
          <div className="hidden space-y-2 sm:block">
            <div className="rounded-md bg-[#eff4f5] p-2">
              <span className="text-[8px] font-semibold uppercase tracking-wider text-[#607379]">Search intent</span>
              <p className="mt-1 text-[9px] font-semibold text-[#1e3560]">&ldquo;invisalign cost newmarket&rdquo;</p>
              <Chip tone="accent" className="mt-1">Ready to book</Chip>
            </div>
            <ul className="space-y-1">
              {[["Image alt text", true], ["Internal links", true], ["Content depth", false]].map(([t, ok]) => (
                <li key={String(t)} className="flex items-center justify-between rounded-md border border-[#e9eff1] px-2 py-1 text-[9px] text-[#1e3560]">
                  {t}
                  <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-[#1f6b52]" : "bg-[#8d5309]"}`} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Browser>
      <FloatCard className="absolute bottom-4 left-5 hidden w-56 sm:block sm:bottom-6 sm:left-8">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4f636b]">Google result preview</span>
        <p className="mt-1 truncate text-[10px] font-semibold text-[#1a0dab]">Invisalign in Newmarket | Maple Grove Dental</p>
        <p className="text-[8px] leading-snug text-[#485d66]">Clear aligners for adults and teens. Free consultation, flexible payment plans…</p>
      </FloatCard>
    </div>
  );
}

function TechnicalHero() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <FloatCard className="absolute left-5 right-5 top-5 sm:left-8 sm:right-auto sm:top-8 sm:w-[58%]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4f636b]">Google PageSpeed · mobile</span>
          <SampleTag />
        </div>
        <div className="mt-1 flex items-center gap-3">
          <SpeedGauge value={92} size={110} />
          <ul className="flex-1 divide-y divide-[#e9eff1]">
            <MetricRow label="LCP" value="1.8 s" />
            <MetricRow label="INP" value="140 ms" />
            <MetricRow label="CLS" value="0.02" />
          </ul>
        </div>
      </FloatCard>
      <FloatCard className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-auto sm:w-[52%]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4f636b]">Diagnostics</span>
        <ul className="mt-1.5 space-y-1 text-[9px] text-[#1e3560]">
          {[["Images compressed and lazy-loaded", true], ["Render-blocking scripts deferred", true], ["Redirect chains flattened", true], ["Third-party scripts under review", false]].map(([t, ok]) => (
            <li key={String(t)} className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-[#1f6b52]" : "bg-[#8d5309]"}`} />
              {t}
            </li>
          ))}
        </ul>
      </FloatCard>
      <FloatCard tone="dark" className="absolute right-5 top-8 hidden w-44 sm:block sm:right-8 sm:top-12">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">Crawl &amp; index</span>
        <ul className="mt-1.5 space-y-1 text-[9px]">
          <li className="flex justify-between"><span className="text-white/70">Sitemap URLs</span><span className="font-semibold">42 live</span></li>
          <li className="flex justify-between"><span className="text-white/70">Canonical issues</span><span className="font-semibold">0</span></li>
          <li className="flex justify-between"><span className="text-white/70">Broken links</span><span className="font-semibold">0</span></li>
          <li className="flex justify-between"><span className="text-white/70">HTTPS</span><span className="font-semibold text-[#8ee0a0]">Secure</span></li>
        </ul>
      </FloatCard>
      <StatCard label="Desktop score" value="98" delta="+31" className="absolute bottom-5 right-5 hidden sm:block sm:bottom-8 sm:right-8" />
    </div>
  );
}

function OffPageHero() {
  const nodes = [
    { x: 60, y: 60, t: "Local news" },
    { x: 250, y: 46, t: "Dental association" },
    { x: 40, y: 190, t: "Community sports club" },
    { x: 262, y: 200, t: "Business directory" },
    { x: 150, y: 232, t: "Supplier partner" },
  ];
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <div className="absolute inset-5 sm:inset-8">
        <svg viewBox="0 0 320 260" className="h-full w-full" aria-hidden>
          <defs>
            <linearGradient id="op-line" x1="0" x2="1">
              <stop offset="0" stopColor="#3b67b2" stopOpacity="0.15" />
              <stop offset="1" stopColor="#3b67b2" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {nodes.map((n) => (
            <line key={n.t} x1={n.x} y1={n.y} x2="160" y2="128" stroke="url(#op-line)" strokeWidth="2" strokeDasharray="4 3" />
          ))}
          {nodes.map((n) => (
            <g key={n.t}>
              <rect x={n.x - 50} y={n.y - 13} width="100" height="26" rx="13" fill="white" stroke="#dce4e6" />
              <circle cx={n.x - 36} cy={n.y} r="6" fill="#e8eff9" />
              <text x={n.x - 25} y={n.y + 3.5} fontSize="9" fontWeight="600" fill="#1e3560" fontFamily="var(--font-poppins), sans-serif">{n.t}</text>
            </g>
          ))}
          <circle cx="160" cy="128" r="34" fill="#3b67b2" />
          <circle cx="160" cy="128" r="42" fill="none" stroke="#3b67b2" strokeOpacity="0.25" strokeWidth="2" />
          <text x="160" y="124" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" fontFamily="var(--font-outfit), sans-serif">Your</text>
          <text x="160" y="136" textAnchor="middle" fontSize="9" fontWeight="700" fill="white" fontFamily="var(--font-outfit), sans-serif">practice</text>
        </svg>
      </div>
      <FloatCard className="absolute bottom-4 right-4 hidden !p-2 sm:block sm:bottom-6 sm:right-8">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#1e3560]">
          <IconLink className="h-3 w-3 text-[#3b67b2]" /> Relevant &amp; earned — no link schemes
        </span>
      </FloatCard>
    </div>
  );
}

function ContentHero() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const marked = new Set([3, 8, 12, 17, 22, 26]);
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <FloatCard className="absolute left-5 right-5 top-5 sm:left-8 sm:right-auto sm:top-8 sm:w-[46%]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4f636b]">Content calendar</span>
          <span className="text-[9px] font-semibold text-[#1e3560]">October</span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {days.map((d) => (
            <span key={d} className={`flex h-5 items-center justify-center rounded text-[8px] ${marked.has(d) ? "bg-[#3b67b2] font-semibold text-white" : "bg-[#eff4f5] text-[#4f636b]"}`}>{d}</span>
          ))}
        </div>
      </FloatCard>
      <div className="absolute right-5 top-6 hidden w-[46%] space-y-2 sm:block sm:right-8 sm:top-10">
        {[
          { t: "Does a root canal hurt? What to expect", s: "Published", tone: "good" as const },
          { t: "Invisalign vs braces for teens", s: "In clinical review", tone: "warn" as const },
          { t: "First visit: what to bring", s: "Draft", tone: "neutral" as const },
        ].map((a) => (
          <FloatCard key={a.t} className="!p-2.5">
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#e8eff9] text-[#3b67b2]">
                <IconFileText className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[10px] font-semibold text-[#1e3560]">{a.t}</span>
                <Chip tone={a.tone} className="mt-1">{a.s}</Chip>
              </span>
            </div>
          </FloatCard>
        ))}
      </div>
      <FloatCard className="absolute bottom-5 left-5 right-5 !p-2.5 sm:bottom-8 sm:left-8 sm:right-8">
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-semibold text-[#1e3560]">
          {["Question patients ask", "Draft", "Dentist review", "Published"].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 ${i === 3 ? "bg-[#1e3560] text-white" : "bg-[#e9eff1]"}`}>{s}</span>
              {i < arr.length - 1 && <span className="text-[#607379]">→</span>}
            </span>
          ))}
        </div>
      </FloatCard>
    </div>
  );
}

function CroHero() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <Browser url="yourpractice.ca/book" className="absolute left-5 right-5 top-5 sm:left-8 sm:right-auto sm:top-8 sm:w-[58%]">
        <div className="relative p-3">
          <p className="font-display text-[13px] font-bold leading-tight text-[#1e3560]">Book a check-up this week</p>
          <Bar w="w-5/6" h="h-1.5" className="mt-2" tone="faint" />
          <Bar w="w-2/3" h="h-1.5" className="mt-1" tone="faint" />
          <div className="relative mt-3 inline-block">
            <span className="rounded-full bg-[#3b67b2] px-3 py-1.5 text-[8px] font-semibold text-white">Request an appointment</span>
            <span className="pointer-events-none absolute -inset-3 rounded-full" style={{ background: "radial-gradient(circle, rgba(59,162,179,0.45) 0%, rgba(59,103,178,0.25) 40%, transparent 70%)" }} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {["Name", "Phone"].map((f) => (
              <span key={f} className="rounded-md border border-[#dce4e6] px-2 py-1 text-[8px] text-[#607379]">{f}</span>
            ))}
          </div>
          <span className="pointer-events-none absolute right-3 top-8 h-14 w-14 rounded-full" style={{ background: "radial-gradient(circle, rgba(59,162,179,0.35) 0%, transparent 70%)" }} />
        </div>
      </Browser>
      <FloatCard className="absolute right-5 top-5 hidden w-[36%] sm:block sm:right-8 sm:top-8">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4f636b]">Journey</span>
          <SampleTag />
        </div>
        <ul className="mt-2 space-y-1.5">
          {[["Visits", 100], ["Viewed booking", 64], ["Started form", 31], ["Submitted", 22]].map(([l, w]) => (
            <li key={String(l)} className="text-[9px] text-[#1e3560]">
              <span className="flex justify-between"><span>{l}</span><span className="text-[#4f636b]">{w}%</span></span>
              <span className="mt-0.5 block h-1.5 rounded-full bg-[#e9eff1]"><span className="block h-full rounded-full bg-[#3b67b2]" style={{ width: `${w}%` }} /></span>
            </li>
          ))}
        </ul>
      </FloatCard>
      <FloatCard className="absolute bottom-5 right-5 hidden !p-2 sm:block sm:bottom-8 sm:right-8">
        <span className="flex items-center gap-2 text-[9px] font-semibold text-[#1e3560]">
          <Chip tone="neutral">A</Chip> Long form
          <span className="text-[#607379]">vs</span>
          <Chip tone="accent">B</Chip> 2 fields
        </span>
      </FloatCard>
      <FloatCard className="absolute bottom-5 left-5 !p-2 sm:bottom-8 sm:left-8">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#1e3560]">
          <IconCursorClick className="h-3 w-3 text-[#3b67b2]" /> Tap-to-call on every page
        </span>
      </FloatCard>
    </div>
  );
}

function AuditHero() {
  return (
    <div className="absolute inset-0 p-5 sm:p-8">
      <FloatCard className="absolute left-5 right-5 top-5 sm:left-8 sm:right-[30%] sm:top-8">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4f636b]">SEO audit · {MOCK_PRACTICE}</span>
          <SampleTag />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Ring value={74} />
          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[#1e3560]">Overall SEO health 74/100</p>
            <p className="text-[8px] text-[#4f636b]">31 verified findings · 1 critical · 11 high</p>
            <div className="mt-1.5 flex gap-1">
              <Chip tone="warn">Critical 1</Chip>
              <Chip tone="accent">High 11</Chip>
              <Chip tone="neutral">Medium 8</Chip>
            </div>
          </div>
        </div>
      </FloatCard>
      <FloatCard className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-auto sm:w-[54%]">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#4f636b]">Action plan</span>
        <ol className="mt-1.5 space-y-1.5">
          {[["Mobile page load performance is poor", "this month"], ["Images are missing alt text", "this week"], ["Canonical points to a different URL", "this week"]].map(([t, w], i) => (
            <li key={String(t)} className="flex items-center gap-2 text-[9px] text-[#1e3560]">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8eff9] text-[8px] font-bold text-[#3b67b2]">{i + 1}</span>
              <span className="flex-1 truncate">{t}</span>
              <span className="text-[8px] text-[#607379]">{w}</span>
            </li>
          ))}
        </ol>
      </FloatCard>
      <FloatCard tone="dark" className="absolute right-5 top-[34%] hidden w-40 sm:block sm:right-8">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">By area</span>
        <ul className="mt-1.5 space-y-1.5 text-[9px]">
          {[["Technical", 87], ["Content", 53], ["Performance", 30]].map(([l, v]) => (
            <li key={String(l)}>
              <span className="flex justify-between"><span className="text-white/80">{l}</span><span className="font-semibold">{v}</span></span>
              <span className="mt-0.5 block h-1 rounded-full bg-white/15"><span className="block h-full rounded-full bg-[#a9c8f2]" style={{ width: `${v}%` }} /></span>
            </li>
          ))}
        </ul>
      </FloatCard>
      <FloatCard className="absolute bottom-5 right-5 hidden !p-2 sm:block sm:bottom-8 sm:right-8">
        <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#1e3560]">
          <IconClipboardCheck className="h-3 w-3 text-[#3b67b2]" /> Customer PDF ready
        </span>
      </FloatCard>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" className="h-14 w-14 shrink-0" aria-hidden>
      <circle cx="26" cy="26" r={r} fill="none" stroke="#dce4e6" strokeWidth="6" />
      <circle cx="26" cy="26" r={r} fill="none" stroke="#8d5309" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 26 26)" />
      <text x="26" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill="#1e3560" fontFamily="var(--font-outfit), sans-serif">{value}</text>
    </svg>
  );
}

function Field({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="rounded-md border border-[#e9eff1] p-2">
      <span className="flex items-center justify-between text-[8px] font-semibold uppercase tracking-wider text-[#607379]">
        {label}
        {ok && <IconCheck className="h-2.5 w-2.5 text-[#1f6b52]" />}
      </span>
      <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-[#1e3560]">{value}</p>
    </div>
  );
}

const HERO: Record<ServiceVisualKey, () => React.JSX.Element> = {
  layout: WebsiteHero,
  mapPin: LocalSeoHero,
  search: OnPageHero,
  gauge: TechnicalHero,
  link: OffPageHero,
  fileText: ContentHero,
  cursorClick: CroHero,
  clipboardCheck: AuditHero,
};

// ───────────────────────────── mini compositions ─────────────────────────────

function MiniVisual({ variant, className = "", flush = false }: { variant: ServiceVisualKey; className?: string; flush?: boolean }) {
  return (
    <VisualFrame tone="soft" glow={false} flush={flush} className={`h-32 ${className}`}>
      <div className="absolute inset-0 overflow-hidden p-4">{MINI[variant]()}</div>
    </VisualFrame>
  );
}

const MINI: Record<ServiceVisualKey, () => React.JSX.Element> = {
  layout: () => (
    <>
      <div className="absolute left-4 right-10 top-4 rounded-t-lg border border-b-0 border-[#dce4e6] bg-white p-2 shadow-sm">
        <span className="flex items-center justify-between"><span className="font-display text-[8px] font-bold text-[#1e3560]">{MOCK_PRACTICE}</span><span className="rounded-full bg-[#3b67b2] px-1.5 py-0.5 text-[6px] font-semibold text-white">Book</span></span>
        <Bar w="w-2/3" h="h-1.5" className="mt-2" tone="ink" />
        <Bar w="w-1/2" h="h-1" className="mt-1" tone="faint" />
        <span className="mt-2 inline-block rounded-full bg-[#3b67b2] px-2 py-1 text-[6px] font-semibold text-white">Book an appointment</span>
      </div>
      <div className="absolute bottom-3 right-4 w-12 rounded-[8px] border-[3px] border-[#1e3560] bg-white p-1.5 shadow-md">
        <Bar w="w-full" h="h-1" tone="ink" />
        <Bar w="w-2/3" h="h-1" className="mt-1" tone="faint" />
        <span className="mt-1.5 block h-2 rounded-full bg-[#3b67b2]" />
      </div>
    </>
  ),
  mapPin: () => (
    <>
      <MapPanel className="absolute inset-3 !rounded-lg" />
      <div className="absolute bottom-3 left-3 rounded-md border border-[#dce4e6] bg-white px-2 py-1 shadow-sm">
        <span className="flex items-center gap-1 text-[8px] font-semibold text-[#1e3560]"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#3b67b2] text-[7px] text-white">2</span>{MOCK_PRACTICE}</span>
      </div>
    </>
  ),
  search: () => (
    <div className="absolute inset-x-4 top-4 rounded-lg border border-[#dce4e6] bg-white p-2.5 shadow-sm">
      <span className="text-[7px] font-semibold uppercase tracking-wider text-[#607379]">Title tag</span>
      <p className="truncate text-[8px] font-semibold text-[#1e3560]">Invisalign in Newmarket | Maple Grove Dental</p>
      <ul className="mt-1.5 space-y-1 text-[7.5px] text-[#1e3560]">
        <li className="font-semibold">H1 · Invisalign clear aligners</li>
        <li className="pl-2 text-[#4f636b]">H2 · What to expect</li>
        <li className="pl-2 text-[#4f636b]">H2 · Cost and payment plans</li>
      </ul>
    </div>
  ),
  gauge: () => (
    <>
      <div className="absolute left-4 top-3"><SpeedGauge value={92} size={96} label="Mobile" /></div>
      <ul className="absolute right-4 top-5 w-24 divide-y divide-[#e9eff1] rounded-lg border border-[#dce4e6] bg-white px-2 shadow-sm">
        <MetricRow label="LCP" value="1.8 s" />
        <MetricRow label="CLS" value="0.02" />
      </ul>
    </>
  ),
  link: () => (
    <svg viewBox="0 0 200 100" className="absolute inset-0 h-full w-full" aria-hidden>
      {[[30, 25], [170, 22], [40, 82], [165, 80]].map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2="100" y2="52" stroke="#3b67b2" strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="3 2" />
          <circle cx={x} cy={y} r="9" fill="white" stroke="#dce4e6" />
          <circle cx={x} cy={y} r="3" fill="#e8eff9" />
        </g>
      ))}
      <circle cx="100" cy="52" r="16" fill="#3b67b2" />
      <IconLinkSvg />
    </svg>
  ),
  fileText: () => (
    <>
      <div className="absolute left-4 top-4 grid w-24 grid-cols-7 gap-0.5">
        {Array.from({ length: 21 }, (_, i) => (
          <span key={i} className={`h-2.5 rounded-sm ${[2, 7, 11, 16].includes(i) ? "bg-[#3b67b2]" : "bg-white"}`} />
        ))}
      </div>
      <div className="absolute right-4 top-4 w-24 space-y-1.5">
        {["Published", "In review", "Draft"].map((s) => (
          <div key={s} className="rounded-md border border-[#dce4e6] bg-white p-1.5 shadow-sm">
            <Bar w="w-full" h="h-1" tone="ink" />
            <Chip tone={s === "Published" ? "good" : s === "In review" ? "warn" : "neutral"} className="mt-1 !text-[7px]">{s}</Chip>
          </div>
        ))}
      </div>
    </>
  ),
  cursorClick: () => (
    <>
      <div className="absolute left-4 top-4 w-28 rounded-lg border border-[#dce4e6] bg-white p-2 shadow-sm">
        <Bar w="w-3/4" h="h-1.5" tone="ink" />
        <Bar w="w-full" h="h-1" className="mt-1" tone="faint" />
        <span className="relative mt-2 inline-block rounded-full bg-[#3b67b2] px-2 py-1 text-[6px] font-semibold text-white">Request appointment<span className="absolute -inset-2 rounded-full" style={{ background: "radial-gradient(circle, rgba(59,162,179,0.45), transparent 70%)" }} /></span>
      </div>
      <ul className="absolute right-4 top-5 w-20 space-y-1">
        {[100, 62, 30].map((w, i) => (
          <li key={i} className="h-2 rounded-full bg-white"><span className="block h-full rounded-full bg-[#3b67b2]" style={{ width: `${w}%`, opacity: 1 - i * 0.25 }} /></li>
        ))}
      </ul>
    </>
  ),
  clipboardCheck: () => (
    <div className="absolute inset-x-4 top-4 flex items-center gap-3 rounded-lg border border-[#dce4e6] bg-white p-2.5 shadow-sm">
      <Ring value={74} />
      <div className="flex-1">
        <p className="text-[8px] font-semibold text-[#1e3560]">SEO health 74/100</p>
        <div className="mt-1 flex gap-1"><Chip tone="warn" className="!text-[7px]">Critical 1</Chip><Chip tone="accent" className="!text-[7px]">High 11</Chip></div>
        <Bar w="w-full" h="h-1" className="mt-1.5" tone="faint" />
      </div>
    </div>
  ),
};

function IconLinkSvg() {
  return (
    <g transform="translate(92 44) scale(0.7)" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11.5 4.4" />
      <path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1l1.3-1.3" />
    </g>
  );
}

export { IconSearch };
