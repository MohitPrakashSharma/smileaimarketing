import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { CtaBackdrop } from "@/components/visuals/compositions";

/**
 * Closing band for secondary pages (about, case studies). Same shape as the
 * homepage FinalCTA, but server-safe and pointing at the audit wizard rather
 * than the homepage's in-page form.
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
    <section className="band-dark relative overflow-hidden">
      <CtaBackdrop />
      <div className="container-site section-space relative">
        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <div>
            <Eyebrow tone="dark">{eyebrow}</Eyebrow>
            <h2 className="mt-4 max-w-[40rem] text-display text-foreground">{heading}</h2>
            {copy && <p className="mt-5 max-w-md text-body-large text-muted-foreground">{copy}</p>}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link href="/free-dental-audit" className={buttonClasses()}>
              <span>Get Your Free Website Audit</span>
              <ButtonArrow />
            </Link>
            <Link href="/book-consultation" className={buttonClasses({ variant: "light" })}>
              Book a Consultation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
