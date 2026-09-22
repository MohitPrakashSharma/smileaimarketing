import { IconTrendingUp } from "@/components/icons";
import { INPUT_LABEL, type OpportunityInputKey, type OpportunityScenario, type SourcedValue } from "@/lib/audit/opportunity/types";

/**
 * Section C — "What could these problems be worth?" Rendered from the
 * scenario the server built (the same object the customer PDF prints), so
 * the two can never disagree. There is no form and no calculator here:
 * what appears depends on the data the practice has authorised.
 *
 *   verified     practice-specific scenario, sources and periods shown
 *   partial      only the figures the available inputs support
 *   illustrative labelled example numbers, never presented as this practice's
 *   formula_only the method only, no dollar figure
 *
 * One deterministic calculation feeds the whole report: no per-finding loss
 * is added up, and no figure is derived from the audit score, PageSpeed or
 * the competitor measurements.
 */
const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 });
const RATE_KEYS: OpportunityInputKey[] = ["currentRate", "targetRate", "patientRate"];
const fmtInput = (key: OpportunityInputKey, v: SourcedValue) => (RATE_KEYS.includes(key) ? `${num.format(v.value * 100)}%` : key === "contribution" ? cad.format(v.value) : num.format(v.value));
const SOURCE_WORD: Record<SourcedValue["source"], string> = { ga4: "Google Analytics", gsc: "Search Console", crm: "booking data", finance: "practice financials", practice_provided: "provided by the practice", assumption: "assumption", illustrative: "example" };

const TAG: Record<OpportunityScenario["mode"], string> = {
  verified: "Practice-specific scenario · estimate",
  partial: "Partial scenario · estimate",
  illustrative: "Illustrative example · not your figures",
  formula_only: "No dollar figure — data not authorised",
};

export default function OpportunitySection({ scenario, publicToken, businessName }: { scenario: OpportunityScenario; publicToken: string; businessName: string }) {
  void publicToken; // the single closing CTA owns the conversion; nothing links out of this section
  const { figures: f, mode } = scenario;
  const hasMoney = f.monthlyContribution !== null;
  const intro =
    mode === "verified"
      ? `A scenario built from the data ${businessName} authorised, with one stated improvement assumption.`
      : mode === "partial"
        ? `Built from the data ${businessName} authorised so far — only what that data supports is shown.`
        : mode === "illustrative"
          ? "This audit measured the website, not your visitors, enquiries or income. Until those are shared, here is how the maths works on example numbers."
          : "This audit measured the website, not your visitors, enquiries or income — so no dollar figure is shown.";
  const usedInputs = (Object.keys(scenario.inputs) as OpportunityInputKey[]).filter((k) => scenario.inputs[k]);

  return (
    <section id="opportunity" aria-labelledby="opportunity-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-growth-soft text-growth-ink"><IconTrendingUp className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 id="opportunity-heading" className="text-heading-2 text-foreground">What could this be worth?</h2>
          <p className="mt-1 text-body-small text-muted-foreground">{intro}</p>
        </div>
      </div>

      <div className="mt-5 rounded-[var(--radius-large)] border border-border bg-background p-5 sm:p-6">
        <p className="text-eyebrow text-muted-foreground">{TAG[mode]}</p>

        {scenario.illustrative ? (
          /* A worked example: the same numbers for every practice, so they are never the headline. */
          <div className="mt-3">
            <p className="text-heading-4 text-foreground">How the maths works, on example numbers</p>
            <p className="mt-2 text-body-small text-foreground">
              On the example inputs below, an enquiry rate lifted by two percentage points would mean{" "}
              {[f.additionalEnquiries !== null ? `${num.format(f.additionalEnquiries)} additional enquiries a month` : null, f.additionalPatients !== null ? `${num.format(f.additionalPatients)} additional patients a month` : null, f.monthlyContribution !== null ? `${cad.format(f.monthlyContribution)} a month in additional contribution` : null]
                .filter(Boolean)
                .join(", ")}
              . These are placeholder numbers used to show the method — they are the same for every practice and say nothing about yours.
            </p>
            <p className="mt-2 text-body-small text-muted-foreground">Share your visitors, enquiry rate and what a new patient is worth in a website review and we will build this scenario with your figures.</p>
          </div>
        ) : hasMoney ? (
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="font-display text-[2.75rem] font-extrabold leading-none tracking-[-0.03em] text-growth-ink sm:text-[3.25rem]">{cad.format(f.monthlyContribution!)}</p>
              <p className="mt-2 text-body-small text-muted-foreground">
                Potential additional contribution a month under this scenario — about <span className="font-semibold text-foreground">{cad.format(f.dailyContribution!)}</span> a day over 30 days.
              </p>
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-3 sm:text-right">
              {f.additionalEnquiries !== null && (
                <div>
                  <dd className="font-display text-[1.5rem] font-bold leading-none text-foreground">{num.format(f.additionalEnquiries)}</dd>
                  <dt className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Extra enquiries / month</dt>
                </div>
              )}
              {f.additionalPatients !== null && (
                <div>
                  <dd className="font-display text-[1.5rem] font-bold leading-none text-foreground">{num.format(f.additionalPatients)}</dd>
                  <dt className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Extra patients / month</dt>
                </div>
              )}
            </dl>
          </div>
        ) : f.additionalEnquiries !== null ? (
          <div className="mt-3">
            <p className="font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] text-foreground">{num.format(f.additionalEnquiries)}</p>
            <p className="mt-2 text-body-small text-muted-foreground">
              Additional enquiries a month under this scenario. A dollar figure needs {scenario.missing.map((k) => INPUT_LABEL[k].toLowerCase()).join(" and ")} — not authorised yet, so none is shown.
            </p>
          </div>
        ) : (
          <ol className="mt-3 space-y-1.5 text-body-small text-foreground">
            <li>1. Additional enquiries a month = monthly visitors × (improved enquiry rate − current enquiry rate)</li>
            <li>2. Additional patients a month = additional enquiries × share of enquiries that become patients</li>
            <li>3. Potential additional contribution = additional patients × contribution per new patient</li>
          </ol>
        )}

        <p className="mt-4 border-t border-border-subtle pt-4 text-metadata text-muted-foreground">{scenario.disclaimer}</p>

        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-metadata font-semibold text-primary hover:underline">
            How this is worked out
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6l4 4 4-4" /></svg>
          </summary>
          <div className="mt-3 space-y-2 text-metadata text-muted-foreground">
            <p>Additional enquiries = monthly visitors × (improved rate − current rate); additional patients = enquiries × the share that become patients; contribution = patients × contribution per new patient; per day = monthly ÷ 30. One calculation for the whole report — no separate loss is added up per issue.</p>
            {usedInputs.length > 0 && (
              <ul className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
                {usedInputs.map((k) => {
                  const v = scenario.inputs[k]!;
                  return (
                    <li key={k}>
                      <span className="text-foreground">{INPUT_LABEL[k]}:</span> {fmtInput(k, v)} · {SOURCE_WORD[v.source]}{v.period ? `, ${v.period}` : ""}
                    </li>
                  );
                })}
              </ul>
            )}
            {scenario.missing.length > 0 && !scenario.illustrative && <p>Not available from authorised data: {scenario.missing.map((k) => INPUT_LABEL[k].toLowerCase()).join(", ")}.</p>}
            {scenario.periods.length > 0 && <p>Measurement period: {scenario.periods.join("; ")}.</p>}
            {scenario.assumptions.map((a) => (
              <p key={a}>{a}</p>
            ))}
            <p>{scenario.sources.join("; ")}.</p>
          </div>
        </details>
      </div>
    </section>
  );
}
