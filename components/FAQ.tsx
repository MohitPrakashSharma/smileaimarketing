import { FAQS } from "./faqData";
import Eyebrow from "@/components/Eyebrow";
import FaqList from "@/components/ui/FaqList";

export default function FAQ() {
  return (
    <section id="faq" className="scroll-mt-[var(--header-height)] bg-background">
      <div className="container-site section-space">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
          <div>
            <Eyebrow>Questions</Eyebrow>
            <h2 className="mt-4 text-heading-2 text-foreground">
              Questions dentists ask before they start.
            </h2>
          </div>
          <FaqList items={FAQS} />
        </div>
      </div>
    </section>
  );
}
