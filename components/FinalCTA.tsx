"use client";

export default function FinalCTA() {
  return (
    <section id="contact" className="border-t border-border bg-surface-muted/30">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-sm sm:py-16">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            FREE CONSULTATION
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Ready to grow your practice?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-body text-muted-foreground leading-relaxed">
            Book a free 20-minute Growth Plan call. We&apos;ll map your city&apos;s competition and highlight your biggest patient acquisition gaps.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/book-consultation"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-body text-base font-bold text-primary-foreground transition-colors hover:bg-primary-hover shadow-sm"
            >
              Get Your Free Growth Plan
            </a>
            <a
              href="mailto:hello@smileaimarketing.com"
              className="text-body font-semibold text-foreground underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary"
            >
              hello@smileaimarketing.com
            </a>
          </div>
          <p className="mt-6 text-metadata text-muted-foreground">
            Dental-only focus · Month-to-month alignment · Human-reviewed actions
          </p>
        </div>
      </div>
    </section>
  );
}
