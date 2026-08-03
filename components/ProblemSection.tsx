import { IconMapPinOff, IconPhoneWave, IconClock } from "@/components/icons";
import Eyebrow from "@/components/Eyebrow";

const PAINS = [
  {
    Icon: IconMapPinOff,
    title: "Invisible on Google",
    quote: "“We don't show up when people search for a dentist nearby.”",
    detail: "Your Google Business Profile and local rankings aren't working for you yet.",
  },
  {
    Icon: IconPhoneWave,
    title: "Unpredictable enquiries",
    quote: "“Some weeks the phone rings, some weeks it doesn't.”",
    detail: "There's no steady, predictable flow of new-patient enquiries.",
  },
  {
    Icon: IconClock,
    title: "No time to run it",
    quote: "“Nobody on our team has time to manage marketing.”",
    detail: "Reviews, ads, and the website all need upkeep no one has hours for.",
  },
];

export default function ProblemSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-20 sm:px-8 sm:py-28">
      <div className="max-w-xl">
        <Eyebrow>Sound familiar?</Eyebrow>
        <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-[2.5rem]">
          Most clinics lose patients before they ever call.
        </h2>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-3">
        {PAINS.map((pain) => (
          <div
            key={pain.title}
            className="group rounded-2xl border border-line bg-white p-7 transition-all duration-200 hover:-translate-y-1 hover:border-teal/40 hover:shadow-[0_20px_40px_-24px_rgba(8,44,58,0.25)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-mist text-teal-deep transition-colors group-hover:bg-teal group-hover:text-white">
              <pain.Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-5 font-display text-xl font-medium text-ink">{pain.title}</h3>
            <p className="mt-3 font-body text-[15px] italic leading-snug text-slate">
              {pain.quote}
            </p>
            <p className="mt-3 font-body text-[14.5px] leading-relaxed text-slate">
              {pain.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
