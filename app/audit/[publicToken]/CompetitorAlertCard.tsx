import { IconTrendingUp } from "@/components/icons";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { METRIC_LABEL } from "@/lib/audit/competitors/view";
import type { LocalComparison, ComparisonMetricKey } from "@/lib/audit/competitors/types";
import { consultationUrl } from "@/lib/audit/technicalReport";

/**
 * A short, separate call-out near the top of the report when the measured
 * comparison shows nearby practices ahead. Every line is a measured
 * PageSpeed difference from the comparison below — it never appears without
 * at least one competitor_better gap, and it says "on the measures we
 * tested", not that a practice is better overall.
 */
export default function CompetitorAlertCard({ comparison, publicToken }: { comparison: LocalComparison; publicToken: string }) {
  const advantages = comparison.gaps.filter((g) => g.direction === "competitor_better");
  if (!advantages.length) return null;
  const metrics = [...new Set(advantages.map((g) => g.metric))] as ComparisonMetricKey[];
  const competitors = [...new Set(advantages.map((g) => g.competitor))];
  const measured = comparison.competitors.filter((c) => c.measurement?.status === "ok").length;
  const strong = advantages.length >= 2;
  // Show the largest gap per metric so the card stays short.
  const top = metrics
    .map((m) => advantages.filter((g) => g.metric === m).sort((a, b) => Math.abs(b.competitorValue - b.practiceValue) - Math.abs(a.competitorValue - a.practiceValue))[0])
    .slice(0, 3);

  return (
    <section id="competitor-alert" aria-labelledby="competitor-alert-heading" className="rounded-2xl border border-primary/40 bg-accent-soft/40 p-6 shadow-sm">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white"><IconTrendingUp className="h-5 w-5" /></span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-primary-ink">Local comparison</p>
            <h2 id="competitor-alert-heading" className="mt-1 text-heading-3 text-foreground">
              {strong ? "Your competitors are doing better" : "A nearby practice measured better"}
            </h2>
            <p className="mt-1 text-body-small text-muted-foreground">
              On {metrics.length} of the 5 website measures we tested, {competitors.length === 1 ? competitors[0] : `${competitors.length} nearby practices`} scored higher than {comparison.practice.name} — same Google PageSpeed test, same device, same page. Website measurements only, not rankings or patient numbers.
            </p>
            <ul className="mt-3 space-y-1.5">
              {top.map((g) => (
                <li key={`${g.competitor}-${g.metric}`} className="flex items-start gap-2 text-body-small text-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>
                    <span className="font-semibold">{METRIC_LABEL[g.metric]}:</span> {g.sentence}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-muted-foreground">
              {measured} of {comparison.competitors.length} nearby homepages could be measured · {comparison.attribution}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 md:items-end">
          <a href="#local-comparison" className={buttonClasses({ size: "sm" })}>
            <span>See the full comparison</span>
            <ButtonArrow />
          </a>
          <a href={consultationUrl("", publicToken)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            Book a website review
          </a>
        </div>
      </div>
    </section>
  );
}
