import Image from "next/image";
import Eyebrow from "@/components/Eyebrow";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Closing band. The homepage now has exactly one audit form (AuditSection,
 * `#seo-audit`), so this section points back to it instead of carrying a
 * second copy of the form.
 */
export default function FinalCTA() {
  return (
    <section id="contact" className="band-dark relative overflow-hidden">
      <Image
        src="/images/dental-operatory-bright.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.12]"
        quality={60}
      />
      <div className="relative container-site section-space-lg">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <Reveal>
            <Eyebrow tone="dark">Free practice audit</Eyebrow>
            <h2 className="mt-5 text-display text-foreground">
              See where your next{" "}
              <span className="text-accent-gradient">patient opportunities</span> may be.
            </h2>
            <p className="mt-6 max-w-md text-body-large text-muted-foreground">
              Enter your practice website and location and we&apos;ll prepare a clear, plain-English review.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <ButtonLink href="#seo-audit" arrow>
              Get My Free Practice Audit
            </ButtonLink>
            <ButtonLink href="/book-consultation" variant="light">
              Book Online Review
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
