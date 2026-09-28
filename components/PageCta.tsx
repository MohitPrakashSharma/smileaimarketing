import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { CtaBackdrop } from "@/components/visuals/compositions";

/**
 * Closing band for secondary pages (about, case studies, services). Same shape
 * as the homepage FinalCTA, but server-safe and pointing at the audit wizard
 * rather than the homepage's in-page form. It sits on the page background —
 * the rings and glows of `CtaBackdrop` carry the section, not a colour block.
 */
export default function PageCta({
  eyebrow = "Get started",
  heading,
  copy,
}: {
  eyebrow?: string;
  heading: React.ReactNode;
  copy?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-background">
      <CtaBackdrop />
      <div className="container-site section-space relative">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-[40rem] text-display text-foreground">{heading}</h2>
            {copy && <p className="mt-5 max-w-md text-body-large text-muted-foreground">{copy}</p>}
          </div>
          {/* Wrap rather than let a label break mid-phrase: at the lg breakpoint the
              two buttons only just fit the 5fr column. */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:justify-end">
            <Link href="/free-dental-audit" className={buttonClasses({ className: "whitespace-nowrap" })}>
              <span>Get Your Free Website Audit</span>
              <ButtonArrow />
            </Link>
            <Link href="/book-consultation" className={buttonClasses({ variant: "secondary", className: "whitespace-nowrap" })}>
              Book a Consultation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
