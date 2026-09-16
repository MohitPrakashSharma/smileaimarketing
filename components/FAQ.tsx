import { FAQS } from "./faqData";
import Eyebrow from "@/components/Eyebrow";
import FaqList from "@/components/ui/FaqList";

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-[var(--header-height)] bg-background">
      <div className="container-site section-space">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-16">
          <div>
            <Eyebrow>Common questions</Eyebrow>
            <h2 className="mt-5 text-heading-2 text-foreground">
              Questions before you start?
            </h2>
          </div>
          <FaqList items={FAQS} />
        </div>
      </div>
    </section>
  );
}
