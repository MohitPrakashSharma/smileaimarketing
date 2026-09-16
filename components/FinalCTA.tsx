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
            <Eyebrow tone="dark">Get started</Eyebrow>
            <h2 className="mt-5 text-display text-foreground">
              Ready to see what&apos;s holding your practice back{" "}
              <span className="text-accent-gradient">online?</span>
            </h2>
            <p className="mt-6 max-w-md text-body-large text-muted-foreground">
              Start with the free website audit, or book a 15-minute consultation with our team. Either way, you&apos;ll leave knowing what to fix first.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <ButtonLink href="#seo-audit" arrow>
              Get Your Free Website Audit
            </ButtonLink>
            <ButtonLink href="/book-consultation" variant="light">
              Book a Consultation
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
