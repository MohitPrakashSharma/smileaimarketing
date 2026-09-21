import Link from "next/link";
import { IconTrendingUp } from "@/components/icons";
import { buttonClasses, ButtonArrow } from "@/components/ui/buttonStyles";
import { consultationUrl } from "@/lib/audit/technicalReport";
import { INPUT_LABEL, type OpportunityInputKey, type OpportunityScenario, type SourcedValue } from "@/lib/audit/opportunity/types";

/**
 * "What Could These Website Issues Be Costing Your Practice?" — rendered
 * automatically from the scenario the server built (the same object the
 * customer PDF prints). Nothing is entered here; nothing is derived from the
 * audit score. What appears depends on the data the practice has authorised:
 *
 *   verified     practice-specific scenario with sources and periods
 *   partial      only the figures the available inputs support, missing inputs named
 *   illustrative labelled example numbers (no authorised data)
 *   formula_only the method and an explanation, no dollar amount
 */
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 });
const RATE_KEYS: OpportunityInputKey[] = ["currentRate", "targetRate", "patientRate"];
const fmtInput = (key: OpportunityInputKey, v: SourcedValue) => (RATE_KEYS.includes(key) ? `${num.format(v.value * 100)}%` : key === "contribution" ? cad.format(v.value) : num.format(v.value));
const SOURCE_WORD: Record<SourcedValue["source"], string> = { ga4: "Google Analytics", gsc: "Search Console", crm: "booking data", finance: "practice financials", practice_provided: "provided by the practice", assumption: "assumption", illustrative: "example" };

function Figure({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-medium)] border border-white/10 bg-white/5 p-4 ${big ? "sm:col-span-2" : ""}`}>
      <dt className="text-metadata text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-display font-bold leading-none ${big ? "text-[2.25rem] tracking-[-0.03em] text-accent-gradient" : "text-[1.75rem] tracking-[-0.02em] text-foreground"}`}>{value}</dd>
    </div>
  );
}

export default function OpportunitySection({ scenario, publicToken, businessName }: { scenario: OpportunityScenario; publicToken: string; businessName: string }) {
  const { figures: f, mode } = scenario;
  const intro =
    mode === "verified"
      ? `A practice-specific scenario built from data ${businessName} authorised, with one stated improvement assumption.`
      : mode === "partial"
        ? `Built from the data ${businessName} authorised so far — only the figures that data supports are shown.`
        : mode === "illustrative"
          ? "The audit measured the website, not your visitors, enquiries or income. Until those are shared, here is how the maths works on clearly labelled example numbers."
          : "The audit measured the website, not your visitors, enquiries or income — so no dollar figure is shown. Here is how the opportunity is worked out.";
  const usedInputs = (Object.keys(scenario.inputs) as OpportunityInputKey[]).filter((k) => scenario.inputs[k]);
  const hasMoney = f.monthlyContribution !== null;

  return (
    <section id="opportunity" aria-labelledby="opportunity-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink"><IconTrendingUp className="h-5 w-5" /></span>
        <div>
          <h2 id="opportunity-heading" className="text-heading-3 text-foreground">{scenario.heading}</h2>
          <p className="mt-1 text-body-small text-muted-foreground">{intro}</p>
        </div>
      </div>

      {/* Figures */}
      <div className="band-dark mt-5 overflow-hidden rounded-[var(--radius-large)] p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-eyebrow text-muted-foreground">
            {mode === "verified" ? "Practice-specific scenario" : mode === "partial" ? "Partial scenario" : mode === "illustrative" ? "Illustrative scenario" : "How the opportunity is calculated"}
          </p>
          {!scenario.illustrative && (
            <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-white/90">
              {mode === "formula_only" ? "No dollar figure" : "Estimate"}
            </span>
          )}
        </div>

        {mode === "formula_only" ? (
          <ol className="mt-4 space-y-2 text-body-small text-foreground-secondary">
            <li>1. Additional enquiries / month = monthly visitors × (improved enquiry rate − current enquiry rate)</li>
            <li>2. Additional patients / month = additional enquiries × share of enquiries that become patients</li>
            <li>3. Potential additional contribution / month = additional patients × contribution per new patient</li>
            <li>4. Per day = monthly ÷ 30</li>
          </ol>
        ) : (
          <dl className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {f.additionalEnquiries !== null && <Figure label="Additional enquiries / month" value={num.format(f.additionalEnquiries)} />}
            {f.additionalPatients !== null && <Figure label="Additional patients / month" value={num.format(f.additionalPatients)} />}
            {hasMoney && (
              <div className="rounded-[var(--radius-medium)] border border-white/10 bg-white/5 p-4 sm:col-span-2">
                <dt className="text-metadata text-muted-foreground">Potential additional contribution under this scenario / month</dt>
                <dd className="mt-1 font-display text-[2.25rem] font-bold leading-none tracking-[-0.03em] text-accent-gradient">{cad.format(f.monthlyContribution!)}</dd>
                <p className="mt-2 text-body-small text-foreground-secondary">
                  About <span className="font-semibold text-foreground">{cad.format(f.dailyContribution!)}</span> per day, spread over 30 days.
                </p>
              </div>
            )}
            {!hasMoney && f.additionalEnquiries !== null && (
              <p className="text-body-small text-foreground-secondary sm:col-span-2">A dollar figure needs {scenario.missing.map((k) => INPUT_LABEL[k].toLowerCase()).join(" and ")} — not available from authorised data yet, so none is shown.</p>
            )}
          </dl>
        )}

        {/* Inputs with provenance */}
        {usedInputs.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-metadata font-semibold text-foreground">{scenario.illustrative ? "Example inputs" : "Inputs used"}</p>
            <ul className="mt-2 grid gap-x-6 gap-y-1 text-metadata text-muted-foreground sm:grid-cols-2">
              {usedInputs.map((k) => {
                const v = scenario.inputs[k]!;
                return (
                  <li key={k}>
                    <span className="text-foreground">{INPUT_LABEL[k]}:</span> {fmtInput(k, v)} <span className="text-white/60">· {SOURCE_WORD[v.source]}{v.period ? `, ${v.period}` : ""}</span>
                  </li>
                );
              })}
            </ul>
            {scenario.missing.length > 0 && !scenario.illustrative && (
              <p className="mt-2 text-metadata text-muted-foreground">Not available from authorised data: {scenario.missing.map((k) => INPUT_LABEL[k].toLowerCase()).join(", ")}.</p>
            )}
          </div>
        )}

        {(scenario.assumptions.length > 0 || scenario.periods.length > 0) && (
          <ul className="mt-3 space-y-1 text-metadata text-muted-foreground">
            {scenario.periods.length > 0 && <li>Measurement period: {scenario.periods.join("; ")}.</li>}
            {scenario.assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        <p className="mt-4 border-t border-white/10 pt-4 text-metadata text-muted-foreground">{scenario.disclaimer}</p>
      </div>

      {/* Conversion */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a href={consultationUrl("", publicToken)} className={buttonClasses()}>
          <span>Discover Your Practice&apos;s Growth Opportunities</span>
          <ButtonArrow />
        </a>
        {(mode === "illustrative" || mode === "formula_only") && (
          <Link href="/#opportunity" className={buttonClasses({ variant: "secondary" })}>
            Run your own numbers
          </Link>
        )}
      </div>
      <p className="mt-3 text-metadata text-muted-foreground">
        This audit identifies verified problems on your website and listing. It does not prove that fixing them will produce the figures above — a review with our team turns your real numbers into a plan.
      </p>
    </section>
  );
}
