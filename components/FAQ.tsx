import Eyebrow from "@/components/Eyebrow";

export const FAQS = [
  {
    q: "How much should I budget for marketing?",
    a: "It depends on your market and competition. On your free growth-plan call, we'll walk through your situation and give you a realistic number — not a generic package price.",
  },
  {
    q: "How long until I see results?",
    a: "Google Business Profile and website fixes can show up within weeks. Local SEO builds over a few months as rankings compound. We'll set realistic expectations upfront, not overnight promises.",
  },
  {
    q: "Do I need a long-term contract?",
    a: "No. We work month-to-month — you stay because it's working, not because you're locked in.",
  },
  {
    q: "Who actually does the work?",
    a: "You work directly with the person managing your account — not a rotating junior team.",
  },
  {
    q: "Do you only work with dental practices?",
    a: "Yes. Dental clinics are the only industry we serve, so every recommendation is built around how patients actually search for a dentist.",
  },
  {
    q: "Will I get real reporting?",
    a: "A plain-English monthly report covering local visibility, enquiries, booked calls, and reviews — the same format shown above, built from your real numbers once we're live.",
  },
  {
    q: "Which locations do you work with?",
    a: "We work with independent and small multi-location dental clinics. Get in touch and we'll confirm we're a fit for your market.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-[1200px] px-6 py-20 sm:px-8 sm:py-28">
      <div className="max-w-xl">
        <Eyebrow>FAQ</Eyebrow>
        <h2 className="mt-4 font-display text-3xl font-medium text-ink sm:text-[2.5rem]">
          Common questions about dental marketing.
        </h2>
      </div>

      <div className="mt-10 divide-y divide-line border-y border-line">
        {FAQS.map((item) => (
          <details key={item.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-body text-[16px] font-semibold text-ink marker:content-none">
              {item.q}
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-mist text-teal-deep transition-transform duration-200 group-open:rotate-45"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </summary>
            <p className="mt-3 max-w-2xl font-body text-[14.5px] leading-relaxed text-slate">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
