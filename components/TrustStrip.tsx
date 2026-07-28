const POINTS = [
  "Dental-only focus",
  "Plain-English reporting",
  "No long-term lock-in",
  "AI-assisted, human-reviewed",
];

export default function TrustStrip() {
  return (
    <div className="border-y border-line/70 bg-mist/60">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5 sm:px-8">
        {POINTS.map((point) => (
          <span
            key={point}
            className="font-label text-[12.5px] uppercase tracking-[0.08em] text-slate"
          >
            {point}
          </span>
        ))}
      </div>
    </div>
  );
}
