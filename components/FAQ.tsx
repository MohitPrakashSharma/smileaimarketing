import { FAQS } from "./faqData";
import Eyebrow from "@/components/Eyebrow";
import { IconChevronDown } from "@/components/icons";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Centred FAQ: heading on top, one wide column of accordion cards below.
 * Native <details>/<summary> — no client JS.
 */
const CONTACT_EMAIL = "hello@smileaimarketing.com";

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-[var(--header-height)] border-t border-border-subtle bg-background">
      <div className="container-site section-space lg:max-w-none">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow className="justify-center">Questions</Eyebrow>
          <h2 className="mt-4 text-heading-2 text-foreground">Questions dentists ask before they start.</h2>
          <p className="mt-4 text-body-small text-muted-foreground">
            Not answered here? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="link-underline font-medium text-foreground">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        {/* ~70% of the viewport on large screens (wider than the site container), gutters below that */}
        <div className="mx-auto mt-10 w-full space-y-3 lg:w-[calc(70vw-2*var(--page-gutter))]">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="card group overflow-hidden transition-[border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-out)] hover:border-border-strong hover:shadow-md open:border-primary/40 open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-5 text-left font-display text-[1.0625rem] font-semibold text-foreground marker:content-none transition-colors duration-[var(--duration-fast)] hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring sm:px-6 sm:text-[1.125rem] [&::-webkit-details-marker]:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary-ink transition-[transform,background-color,color] duration-[var(--duration-normal)] ease-[var(--ease-out)] group-open:rotate-180 group-open:bg-primary group-open:text-white"
                >
                  <IconChevronDown className="h-4 w-4" />
                </span>
              </summary>
              <p className="max-w-[60rem] px-5 pb-6 text-body-small leading-relaxed text-muted-foreground sm:px-6">{item.a}</p>
            </details>
          ))}
        </div>

        {/* Closing nudge: the answer to most of these is "just run the audit" */}
        <div className="mx-auto mt-10 flex w-full flex-col items-center gap-4 rounded-[var(--radius-large)] border border-border-subtle bg-background-alt px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left lg:w-[calc(70vw-2*var(--page-gutter))]">
          <div>
            <p className="text-heading-4 text-foreground">Still deciding? Let the audit answer it.</p>
            <p className="mt-1 text-body-small text-muted-foreground">Two minutes, no logins, no obligation — and you keep the report either way.</p>
          </div>
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            <ButtonLink href="#seo-audit" size="sm" arrow>
              Get Your Free Website Audit
            </ButtonLink>
            <ButtonLink href="/book-consultation" variant="secondary" size="sm">
              Book a Consultation
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
