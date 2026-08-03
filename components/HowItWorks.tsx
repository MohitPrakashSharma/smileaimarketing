import { IconTarget, IconTrendingUp, IconCalendarCheck } from "@/components/icons";
import Eyebrow from "@/components/Eyebrow";

const STEPS = [
  {
    Icon: IconTarget,
    title: "Identify opportunities",
    copy: "We audit your current visibility, listings, and local competitors to find exactly where you're losing patients.",
  },
  {
    Icon: IconTrendingUp,
    title: "Improve visibility",
    copy: "We fix and optimise your Google Business Profile, local SEO, and website so you show up when it matters.",
  },
  {
    Icon: IconCalendarCheck,
    title: "Generate more booked appointments",
    copy: "Enquiries get followed up quickly and turned into appointments on your calendar.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-line/70 bg-mist/50">
      <div className="mx-auto max-w-[1200px] px-6 py-20 sm:px-8 sm:py-28">
        <div className="max-w-xl">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-[2.5rem]">
            Three steps. Run every month.
          </h2>
        </div>

        <ol className="mt-14 grid gap-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl bg-white p-7 border border-line">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal-deep">
                  <step.Icon className="h-6 w-6" />
                </span>
                <span className="font-label text-[13px] text-teal-deep">
                  Step {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 font-display text-xl font-medium text-ink">{step.title}</h3>
              <p className="mt-3 font-body text-[14.5px] leading-relaxed text-slate">
                {step.copy}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
