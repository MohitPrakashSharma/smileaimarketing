import { IconTrendingUp } from "@/components/icons";
import OpportunityCalculatorCard from "@/components/opportunity/OpportunityCalculatorCard";
import { consultationUrl } from "@/lib/audit/technicalReport";

/**
 * "What could your website be costing you?" inside the audit report. The
 * audit measures the website, not the practice's traffic or bookings, so we
 * have no verified visitor, enquiry-rate or patient-value figures to prefill:
 * the reader enters their own numbers (or loads the clearly illustrative
 * example). Nothing typed here is stored or attached to the audit, and the
 * result is a scenario, never a measured loss.
 */
export default function OpportunitySection({ publicToken, businessName }: { publicToken: string; businessName: string }) {
  return (
    <section id="opportunity" aria-labelledby="opportunity-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink"><IconTrendingUp className="h-5 w-5" /></span>
        <div>
          <h2 id="opportunity-heading" className="text-heading-3 text-foreground">What could your website be costing you?</h2>
          <p className="mt-1 text-body-small text-muted-foreground">
            The findings above are verified measurements of {businessName}&apos;s website. This calculator is different: it&apos;s a what-if. We don&apos;t have your visitor numbers, enquiry rate or patient value, so enter them from your own analytics and front desk — or load the illustrative example to see how the maths works.
          </p>
        </div>
      </div>
      <OpportunityCalculatorCard
        className="mt-5 !border-border-subtle !shadow-none"
        title="Run your practice's scenario"
        intro="Your numbers stay in this page — they are not saved to the audit or sent to us."
        primaryCta={{ label: "Book a website review", href: consultationUrl("", publicToken) }}
        footnote="This audit identifies verified problems on your website and listing. It does not prove that fixing them will produce the figures above — those depend on the numbers you enter and on what you change."
      />
    </section>
  );
}
