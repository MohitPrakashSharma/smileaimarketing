import { IconCheck, IconTrendingUp, IconClipboardCheck, IconMapPin, IconMonitor, IconGauge, IconPhoneWave } from "@/components/icons";
import { VisualFrame, Laptop, Phone, Browser, FloatCard, Bar, Chip, SampleTag } from "./primitives";
import { MockSite, RankCard, EnquiryCard, StatCard, SpeedGauge, MOCK_PRACTICE } from "./cards";

/**
 * Page-level compositions built from the primitives and cards:
 *   HeroVisual        homepage hero stage
 *   JourneyVisual     /services "how the services work together"
 *   AboutVisual       /about hero (strategy → audit → roadmap → growth)
 *   BeforeAfterVisual /case-studies feature (cluttered → clear)
 *   CtaBackdrop       abstract rings/glows for the dark CTA bands
 */

export function HeroVisual() {
  return (
    <VisualFrame
      label="Illustration: a dental practice website on a laptop and a phone, with a local search ranking card, a new appointment request and a mobile performance score."
      className="aspect-[4/5] w-full sm:aspect-[5/4] lg:aspect-[1/1] xl:aspect-[5/4]"
    >
      <div className="absolute inset-0">
        <Laptop className="absolute left-[5%] right-[5%] top-[8%] sm:left-[21%] sm:right-[4%] sm:top-[9%]">
          <MockSite />
        </Laptop>
        <Phone className="absolute bottom-[4%] right-[2%] hidden !w-[7.5rem] sm:block">
          <MockSite variant="mobile" photo={false} />
        </Phone>
        <RankCard compact className="absolute left-[3%] top-[30%] hidden !w-44 !p-2.5 sm:block" />
        <EnquiryCard className="absolute bottom-[7%] left-[4%] !w-48" />
        <FloatCard className="absolute right-[3%] top-[3%] hidden !p-2 sm:block">
          <SpeedGauge value={92} size={60} label="Mobile" />
        </FloatCard>
      </div>
    </VisualFrame>
  );
}

/** Four connected stages of the patient's path, each with its card. */
export function JourneyVisual() {
  const stages = [
    { Icon: IconMapPin, label: "Found nearby", card: <RankCard compact className="!w-full" /> },
    { Icon: IconMonitor, label: "Understood", card: <PageCard /> },
    { Icon: IconGauge, label: "Loads fast", card: <SpeedCard /> },
    { Icon: IconPhoneWave, label: "Gets in touch", card: <EnquiryCard className="!w-full" /> },
  ];
  return (
    <VisualFrame tone="soft" label="Illustration: four connected steps — found nearby, understood, loads fast, gets in touch — each shown as a small interface card." className="w-full">
      <div className="relative grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <span className="pointer-events-none absolute left-[12%] right-[12%] top-[2.35rem] hidden h-px bg-[#d81b6a]/30 xl:block" style={{ backgroundImage: "linear-gradient(90deg, transparent, #d81b6a 20%, #d81b6a 80%, transparent)" }} />
        {stages.map((s, i) => (
          <div key={s.label} className="relative">
            <div className="mb-3 flex items-center gap-2">
              <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#e6e4e1] bg-white text-[#d81b6a] shadow-sm">
                <s.Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6a70]">{String(i + 1).padStart(2, "0")} · {s.label}</span>
            </div>
            {s.card}
          </div>
        ))}
      </div>
    </VisualFrame>
  );
}

function PageCard() {
  return (
    <FloatCard className="w-full">
      <span className="text-[9px] font-semibold uppercase tracking-wider text-[#6b6a70]">Service page</span>
      <p className="mt-1 font-display text-[11px] font-bold leading-tight text-[#2d2c2b]">Invisalign in Newmarket</p>
      <Bar w="w-full" h="h-1" className="mt-1.5" tone="faint" />
      <Bar w="w-4/5" h="h-1" className="mt-1" tone="faint" />
      <ul className="mt-2 space-y-1 text-[8.5px] text-[#2d2c2b]">
        {["Title & description", "One clear H1", "Alt text on images"].map((t) => (
          <li key={t} className="flex items-center gap-1.5"><IconCheck className="h-2.5 w-2.5 text-[#1e7a3a]" />{t}</li>
        ))}
      </ul>
    </FloatCard>
  );
}

function SpeedCard() {
  return (
    <FloatCard className="flex w-full items-center gap-3">
      <SpeedGauge value={92} size={84} label="Mobile" />
      <ul className="flex-1 text-[9px] text-[#2d2c2b]">
        <li className="flex justify-between py-1"><span className="text-[#6b6a70]">LCP</span><span className="font-semibold">1.8 s</span></li>
        <li className="flex justify-between border-t border-[#f0eee9] py-1"><span className="text-[#6b6a70]">CLS</span><span className="font-semibold">0.02</span></li>
      </ul>
    </FloatCard>
  );
}

/** Strategy → audit → roadmap → growth, layered. */
export function AboutVisual() {
  return (
    <VisualFrame label="Illustration: an audit report card, a prioritized roadmap and a growth chart layered together." className="aspect-[4/5] w-full sm:aspect-[5/4]">
      <div className="absolute inset-0 p-5 sm:p-8">
        <FloatCard className="absolute left-5 right-5 top-5 sm:left-8 sm:right-auto sm:top-8 sm:w-[60%]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#6b6a70]"><IconClipboardCheck className="h-3 w-3 text-[#d81b6a]" /> Audit · {MOCK_PRACTICE}</span>
            <SampleTag />
          </div>
          <ul className="mt-2 space-y-1.5 text-[9px] text-[#2d2c2b]">
            {[["Technical health", 87], ["On-page content", 53], ["Performance", 30]].map(([l, v]) => (
              <li key={String(l)}>
                <span className="flex justify-between"><span>{l}</span><span className="font-semibold">{v}/100</span></span>
                <span className="mt-0.5 block h-1.5 rounded-full bg-[#f3f1ee]"><span className="block h-full rounded-full" style={{ width: `${v}%`, background: Number(v) >= 80 ? "#1e7a3a" : Number(v) >= 50 ? "#c46a00" : "#d81b6a" }} /></span>
              </li>
            ))}
          </ul>
        </FloatCard>
        <FloatCard tone="dark" className="absolute right-5 top-[30%] hidden w-[46%] sm:block sm:right-8">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-white/60">Roadmap</span>
          <ol className="mt-1.5 space-y-1.5 text-[9px]">
            {[["Fix mobile speed", "This month"], ["Rewrite service pages", "This month"], ["Local citations", "Next quarter"]].map(([t, w], i) => (
              <li key={String(t)} className="flex items-center gap-2">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#ff7a8c] text-[8px] font-bold text-[#1e1b47]">{i + 1}</span>
                <span className="flex-1 truncate">{t}</span>
                <span className="text-[8px] text-white/60">{w}</span>
              </li>
            ))}
          </ol>
        </FloatCard>
        <FloatCard className="absolute bottom-5 left-5 right-5 sm:bottom-8 sm:left-8 sm:right-auto sm:w-[54%]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#6b6a70]"><IconTrendingUp className="h-3 w-3 text-[#d81b6a]" /> Re-measured</span>
            <SampleTag />
          </div>
          <svg viewBox="0 0 200 60" className="mt-2 h-14 w-full" aria-hidden>
            <defs>
              <linearGradient id="ab-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#d81b6a" stopOpacity="0.28" />
                <stop offset="1" stopColor="#d81b6a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 50 C 30 48, 50 44, 70 40 S 110 30, 130 24 S 170 12, 200 6 L200 60 L0 60z" fill="url(#ab-fill)" />
            <path d="M0 50 C 30 48, 50 44, 70 40 S 110 30, 130 24 S 170 12, 200 6" fill="none" stroke="#d81b6a" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="200" cy="6" r="3.5" fill="#d81b6a" />
          </svg>
          <span className="flex justify-between text-[8px] text-[#8e8c94]"><span>Audit 1</span><span>Audit 2</span><span>Audit 3</span></span>
        </FloatCard>
        <FloatCard className="absolute bottom-5 right-5 hidden !p-2 sm:block sm:bottom-8 sm:right-8">
          <span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#2d2c2b]"><IconCheck className="h-3 w-3 text-[#1e7a3a]" /> Evidence before assumptions</span>
        </FloatCard>
      </div>
    </VisualFrame>
  );
}

/** Two small browser windows: the cluttered "before" and the clear "after". */
export function BeforeAfterVisual({ className = "" }: { className?: string }) {
  return (
    <VisualFrame tone="soft" glow={false} label="Illustration: a cluttered page with many competing buttons beside a clear page with one call to action." className={className}>
      <div className="grid grid-cols-2 gap-3 p-4">
        <div>
          <Chip tone="neutral" className="mb-2">Before</Chip>
          <Browser url="old-site" className="!shadow-md">
            <div className="p-2">
              <div className="flex flex-wrap gap-1">
                {["Analyse", "Run audit", "Get plan", "Consult"].map((t) => (
                  <span key={t} className="rounded-full bg-[#6b6a70] px-1.5 py-0.5 text-[6px] font-semibold text-white">{t}</span>
                ))}
              </div>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="mt-1.5 rounded border border-[#f0eee9] p-1">
                  <Bar w="w-2/3" h="h-1" tone="faint" />
                  <Bar w="w-full" h="h-1" className="mt-0.5" tone="faint" />
                </div>
              ))}
            </div>
          </Browser>
        </div>
        <div>
          <Chip tone="accent" className="mb-2">After</Chip>
          <Browser url="smileaimarketing.com" className="!shadow-md">
            <div className="p-2">
              <p className="font-display text-[9px] font-bold leading-tight text-[#2d2c2b]">Grow your dental practice</p>
              <Bar w="w-5/6" h="h-1" className="mt-1" tone="faint" />
              <span className="mt-1.5 inline-block rounded-full bg-[#d81b6a] px-2 py-0.5 text-[6px] font-semibold text-white">Audit my practice</span>
              <div className="mt-2 grid grid-cols-3 gap-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded border border-[#f0eee9] p-1">
                    <span className="mb-1 block h-2.5 w-2.5 rounded-full bg-[#fde9f1]" />
                    <Bar w="w-full" h="h-1" tone="faint" />
                  </div>
                ))}
              </div>
              <div className="mt-2 rounded border border-[#f0eee9] p-1">
                <Bar w="w-1/2" h="h-1" tone="ink" />
                <div className="mt-1 grid grid-cols-2 gap-1">
                  <span className="h-3 rounded border border-[#e6e4e1]" />
                  <span className="h-3 rounded border border-[#e6e4e1]" />
                </div>
              </div>
            </div>
          </Browser>
        </div>
      </div>
    </VisualFrame>
  );
}

/** Abstract backdrop for dark CTA bands: soft glows and concentric rings. */
export function CtaBackdrop({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute -left-24 -top-32 h-96 w-96 rounded-full blur-3xl" style={{ background: "rgba(255,38,103,0.22)" }} />
      <div className="absolute -bottom-40 right-[10%] h-[28rem] w-[28rem] rounded-full blur-3xl" style={{ background: "rgba(255,107,60,0.16)" }} />
      <svg className="absolute -right-24 -top-24 h-[36rem] w-[36rem] opacity-40" viewBox="0 0 400 400" fill="none">
        {[60, 110, 160, 210].map((r, i) => (
          <circle key={r} cx="200" cy="200" r={r} stroke="white" strokeOpacity={0.18 - i * 0.035} strokeWidth="1" />
        ))}
        <circle cx="200" cy="200" r="4" fill="#ff7a8c" />
        <circle cx="290" cy="150" r="3" fill="#ff7a8c" fillOpacity="0.8" />
        <circle cx="120" cy="290" r="3" fill="white" fillOpacity="0.5" />
      </svg>
      <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)", backgroundSize: "26px 26px", maskImage: "linear-gradient(90deg, rgba(0,0,0,0.6), transparent 70%)" }} />
    </div>
  );
}

/** Small stack of stat cards for the CTA band (dark or light). */
export function CtaCards({ tone = "dark" }: { tone?: "light" | "dark" }) {
  return (
    <div className="relative hidden h-64 w-[26rem] lg:block" aria-hidden>
      <StatCard tone={tone} label="Enquiries" value="38" delta="+12" className="absolute left-0 top-0" />
      <FloatCard tone={tone} className="absolute right-0 top-6 w-48">
        <div className="flex items-center gap-2">
          <SpeedGauge value={92} size={56} label="" />
          <span className="text-[10px] font-semibold leading-tight">Mobile<br />performance</span>
        </div>
      </FloatCard>
      <EnquiryCard tone={tone} className="absolute left-16 top-32" />
    </div>
  );
}
