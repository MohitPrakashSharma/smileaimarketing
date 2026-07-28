const PAINS = [
  {
    quote: "We don't show up when people search “dentist near me.”",
    detail: "Your Google Business Profile and local rankings aren't working for you yet.",
  },
  {
    quote: "Some weeks the phone rings, some weeks it doesn't.",
    detail: "There's no steady, predictable flow of new-patient enquiries.",
  },
  {
    quote: "Nobody on our team has time to run marketing.",
    detail: "Reviews, ads, and the website all need upkeep no one has hours for.",
  },
];

export default function ProblemSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:px-8 sm:py-24">
      <div className="max-w-xl">
        <p className="font-label text-[13px] uppercase tracking-[0.14em] text-teal-deep">
          Sound familiar?
        </p>
        <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-4xl">
          Most clinics lose patients before they ever call.
        </h2>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {PAINS.map((pain) => (
          <div
            key={pain.quote}
            className="rounded-2xl border border-line bg-white p-6"
          >
            <p className="font-display text-lg italic leading-snug text-ink">
              “{pain.quote}”
            </p>
            <p className="mt-4 font-body text-[15px] leading-relaxed text-slate">
              {pain.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
