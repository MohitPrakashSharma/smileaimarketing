const REASONS = [
  {
    title: "Always-on monitoring",
    copy: "Rankings, listings, and reviews get tracked daily — not just when someone remembers to check.",
  },
  {
    title: "Faster first response",
    copy: "New enquiries get an instant, AI-assisted reply so leads don't go cold waiting on a callback.",
  },
  {
    title: "Decisions from real data",
    copy: "Ad spend and content are guided by actual local search demand, not guesswork.",
  },
];

export default function WhyAI() {
  return (
    <section id="why-ai" className="bg-mist/60">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="font-label text-[13px] uppercase tracking-[0.14em] text-teal-deep">
            Where &ldquo;AI&rdquo; actually helps
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-4xl">
            AI runs the busywork. People make the judgment calls.
          </h2>
          <p className="mt-5 font-body text-[15.5px] leading-relaxed text-slate">
            No chatbots pretending to be your front desk. AI handles the constant
            watching and fast responses; a real strategist reviews the work and
            decisions every month.
          </p>
        </div>

        <div className="space-y-6">
          {REASONS.map((reason) => (
            <div
              key={reason.title}
              className="flex gap-4 rounded-xl border border-line bg-white p-5"
            >
              <span className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral/50" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
              </span>
              <div>
                <h3 className="font-display text-lg font-medium text-ink">
                  {reason.title}
                </h3>
                <p className="mt-1.5 font-body text-[14.5px] leading-relaxed text-slate">
                  {reason.copy}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
