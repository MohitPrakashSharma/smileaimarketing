"use client";

import { useId, useMemo, useState } from "react";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { ButtonLink } from "@/components/ui/Button";
import {
  EMPTY_INPUTS,
  ILLUSTRATIVE_INPUTS,
  computeOpportunity,
  validateInputs,
  type OpportunityField,
  type OpportunityInputs,
} from "@/lib/opportunityCalculator";

/**
 * The interactive missed-opportunity calculator card — shared by the homepage
 * section and the audit report. Inputs live only in component state: nothing
 * is stored, sent to analytics or attached to an audit. Results are estimates
 * from the visitor's own numbers, never a measured loss.
 */
const FIELDS: { key: OpportunityField; label: string; hint: string; suffix?: string; prefix?: string }[] = [
  { key: "monthlyVisitors", label: "Monthly website visitors", hint: "From your analytics — the number of people who visit each month." },
  { key: "currentRate", label: "Current enquiry rate", hint: "% of visitors who call, book or submit a form today.", suffix: "%" },
  { key: "targetRate", label: "Improved enquiry rate", hint: "% you'd like to reach — the scenario to explore.", suffix: "%" },
  { key: "patientRate", label: "Enquiries that become patients", hint: "% of enquiries your front desk turns into booked patients.", suffix: "%" },
  { key: "contribution", label: "Contribution per new patient", hint: "Your own estimate of what a new patient is worth, in CAD.", prefix: "$" },
];

export const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
export const num = new Intl.NumberFormat("en-CA", { maximumFractionDigits: 1 });

export type OpportunityCalculatorCardProps = {
  title?: string;
  intro?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** The honesty line under the CTAs. */
  footnote: string;
  className?: string;
};

export default function OpportunityCalculatorCard({
  title = "Run your own scenario",
  intro = "Enter your practice's numbers, or load a clearly illustrative example to see how it works.",
  primaryCta,
  secondaryCta,
  footnote,
  className = "",
}: OpportunityCalculatorCardProps) {
  const uid = useId();
  const [inputs, setInputs] = useState<OpportunityInputs>(EMPTY_INPUTS);
  const [usingExample, setUsingExample] = useState(false);

  const { values, errors, complete } = useMemo(() => validateInputs(inputs), [inputs]);
  const result = complete ? computeOpportunity(values as Record<OpportunityField, number>) : null;

  const update = (key: OpportunityField, raw: string) => {
    setUsingExample(false);
    setInputs((prev) => ({ ...prev, [key]: raw }));
  };
  const loadExample = () => {
    setInputs(ILLUSTRATIVE_INPUTS);
    setUsingExample(true);
  };
  const clear = () => {
    setInputs(EMPTY_INPUTS);
    setUsingExample(false);
  };

  return (
    <div className={`card min-w-0 p-5 sm:p-7 ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-heading-4 text-foreground">{title}</h3>
          <p className="mt-1 text-body-small text-muted-foreground">{intro}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={loadExample} className="rounded-full border border-border-strong px-3.5 py-1.5 text-metadata font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-white">
            Load illustrative example
          </button>
          <button type="button" onClick={clear} className="rounded-full px-3.5 py-1.5 text-metadata font-semibold text-muted-foreground transition-colors hover:text-foreground">
            Clear
          </button>
        </div>
      </div>

      {usingExample && (
        <p className="mt-4 rounded-[var(--radius-small)] border border-border bg-background-alt px-3 py-2 text-metadata text-foreground" role="status">
          <span className="font-semibold">Illustrative example.</span> These numbers are placeholders to show the maths — they are not benchmarks and say nothing about your practice. Replace them with your own.
        </p>
      )}

      <form className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} noValidate>
        {FIELDS.map((f) => {
          const id = `${uid}-${f.key}`;
          const error = errors[f.key];
          return (
            <FormField key={f.key} id={id} label={f.label} hint={f.hint} error={error} optionalLabel={false}>
              <div className="relative">
                {f.prefix && <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body text-muted-foreground">{f.prefix}</span>}
                <Input
                  id={id}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={inputs[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  hasError={Boolean(error)}
                  aria-describedby={error ? `${id}-error` : undefined}
                  className={`${f.prefix ? "pl-8" : ""} ${f.suffix ? "pr-10" : ""}`}
                  placeholder={f.key === "monthlyVisitors" ? "e.g. your monthly total" : ""}
                />
                {f.suffix && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body text-muted-foreground">{f.suffix}</span>}
              </div>
            </FormField>
          );
        })}
      </form>

      {/* Results panel */}
      <div className="band-dark mt-7 overflow-hidden rounded-[var(--radius-large)] p-5 sm:p-6" aria-live="polite">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-eyebrow text-muted-foreground">Hypothetical improvement scenario</p>
          <span className="rounded-full border border-white/20 px-2.5 py-0.5 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-white/90">Estimate</span>
        </div>

        {result ? (
          <>
            {result.noUplift && (
              <p className="mt-4 text-body-small text-foreground-secondary">
                Your improved rate isn&apos;t above your current rate, so there&apos;s no uplift to show. Raise the improved enquiry rate to explore a scenario.
              </p>
            )}
            <dl className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--radius-medium)] border border-white/10 bg-white/5 p-4">
                <dt className="text-metadata text-muted-foreground">Additional enquiries / month</dt>
                <dd className="mt-1 font-display text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-foreground">{num.format(result.additionalEnquiries)}</dd>
              </div>
              <div className="rounded-[var(--radius-medium)] border border-white/10 bg-white/5 p-4">
                <dt className="text-metadata text-muted-foreground">Additional patients / month</dt>
                <dd className="mt-1 font-display text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-foreground">{num.format(result.additionalPatients)}</dd>
              </div>
              <div className="rounded-[var(--radius-medium)] border border-white/10 bg-white/5 p-4 sm:col-span-2">
                <dt className="text-metadata text-muted-foreground">Potential additional contribution / month</dt>
                <dd className="mt-1 font-display text-[2.25rem] font-bold leading-none tracking-[-0.03em] text-accent-gradient">{cad.format(result.monthlyContribution)}</dd>
                <p className="mt-2 text-body-small text-foreground-secondary">
                  About <span className="font-semibold text-foreground">{cad.format(result.dailyContribution)}</span> per day, spread over 30 days.
                </p>
              </div>
            </dl>
          </>
        ) : (
          <p className="mt-4 text-body-small text-foreground-secondary">
            {Object.keys(errors).length > 0
              ? "Fix the highlighted fields to see the scenario."
              : "Fill in all five fields to see the scenario. Nothing you enter is stored or sent anywhere."}
          </p>
        )}

        <p className="mt-5 border-t border-white/10 pt-4 text-metadata text-muted-foreground">
          How it&apos;s worked out: additional enquiries = visitors × (improved rate − current rate); patients = enquiries × your enquiry-to-patient rate; contribution = patients × your value per patient; daily = monthly ÷ 30. These are estimates from the numbers you enter — a scenario, not a measured loss or a forecast.
        </p>
      </div>

      {/* Conversion */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <ButtonLink href={primaryCta.href} arrow>
          {primaryCta.label}
        </ButtonLink>
        {secondaryCta && (
          <ButtonLink href={secondaryCta.href} variant="secondary">
            {secondaryCta.label}
          </ButtonLink>
        )}
      </div>
      <p className="mt-3 text-metadata text-muted-foreground">{footnote}</p>
    </div>
  );
}
