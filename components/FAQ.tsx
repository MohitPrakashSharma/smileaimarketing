"use client";

import { FAQS } from "./faqData";

export default function FAQ() {
  return (
    <section id="faq" className="border-t border-border bg-white scroll-mt-16">
      <div className="mx-auto max-w-[1200px] px-6 py-16 sm:py-24 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="rounded-full bg-accent-soft px-3 py-1 font-label text-xs tracking-wider text-primary">
            COMMON QUESTIONS
          </span>
          <h2 className="mt-4 text-heading-1 font-semibold text-foreground">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-body text-muted-foreground">
            Understand how our local visibility scanner works and how we protect your practice credentials.
          </p>
        </div>

        <div className="mt-12 mx-auto max-w-3xl divide-y divide-border border-y border-border">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-body font-semibold text-foreground marker:content-none focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 -mx-2">
                {item.q}
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-primary transition-transform duration-200 group-open:rotate-45"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-body-small text-muted-foreground leading-relaxed pl-2">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
