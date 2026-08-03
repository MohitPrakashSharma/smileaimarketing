import Eyebrow from "@/components/Eyebrow";

export default function FinalCTA() {
  return (
    <section id="contact" className="bg-paper">
      <div className="mx-auto max-w-[1200px] px-6 py-20 sm:px-8 sm:py-28">
        <div className="rounded-3xl border border-line bg-white px-8 py-16 text-center shadow-[0_30px_60px_-35px_rgba(8,44,58,0.25)] sm:py-20">
          <Eyebrow>Free growth plan</Eyebrow>
          <h2 className="mt-5 font-display text-3xl font-medium text-ink sm:text-[2.75rem]">
            Ready to grow your clinic locally?
          </h2>
          <p className="mx-auto mt-5 max-w-md font-body text-[15.5px] leading-relaxed text-slate">
            Tell us about your practice on a free 20-minute call. No pressure, no
            contracts to sign on the spot.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="mailto:hello@smileaimarketing.com?subject=Free%20growth%20plan"
              className="rounded-full bg-teal px-8 py-4 font-body text-base font-semibold text-ink shadow-[0_14px_34px_-14px_rgba(14,170,155,0.55)] transition-colors hover:bg-teal-deep hover:text-white"
            >
              Get Your Free Growth Plan
            </a>
            <a
              href="mailto:hello@smileaimarketing.com"
              className="font-body text-[15px] font-medium text-ink underline decoration-line decoration-2 underline-offset-4 transition-colors hover:decoration-teal"
            >
              hello@smileaimarketing.com
            </a>
          </div>
          <p className="mt-6 font-body text-[13.5px] text-slate">
            Dental-only marketing <span className="mx-2 text-line" aria-hidden>·</span>
            No long-term contracts <span className="mx-2 text-line" aria-hidden>·</span>
            Human-reviewed campaigns
          </p>
        </div>
      </div>
    </section>
  );
}
