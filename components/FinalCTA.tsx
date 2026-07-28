export default function FinalCTA() {
  return (
    <section id="contact" className="bg-ink text-white">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-8 sm:py-28">
        <h2 className="font-display text-3xl font-medium sm:text-4xl">
          Ready to fill your calendar with the right patients?
        </h2>
        <p className="mx-auto mt-5 max-w-md font-body text-[15.5px] leading-relaxed text-white/65">
          Tell us about your practice on a free 20-minute call. No pressure, no
          contracts to sign on the spot.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:hello@smileaimarketing.com?subject=Free%20strategy%20call"
            className="rounded-full bg-teal px-7 py-3.5 font-body text-[15px] font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(18,165,148,0.6)] transition-colors hover:bg-white"
          >
            Book a free strategy call
          </a>
          <a
            href="mailto:hello@smileaimarketing.com"
            className="font-body text-[15px] font-medium text-white/85 underline decoration-white/30 decoration-2 underline-offset-4 transition-colors hover:decoration-teal"
          >
            hello@smileaimarketing.com
          </a>
        </div>
      </div>
    </section>
  );
}
