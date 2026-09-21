import { IconMapPin, IconMapPinOff } from "@/components/icons";

/**
 * Placeholders for the local comparison slot while there is no comparison to
 * show. "Pending" is rendered only while the stored stage says the analysis
 * is still queued or running (the page polls and swaps in the real section);
 * "unavailable" only for a genuine failure. Neither ever shows a number.
 */

export function LocalComparisonPending() {
  return (
    <section id="local-comparison" aria-labelledby="local-comparison-heading" aria-busy="true" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary-ink">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 motion-reduce:hidden" aria-hidden />
          <IconMapPin className="relative h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="local-comparison-heading" className="text-heading-3 text-foreground">Analysing nearby competitors…</h2>
          <p className="mt-1 text-body-small text-muted-foreground" role="status" aria-live="polite">
            We are identifying verified dental practices near you and testing their homepages with the same Google PageSpeed test used for yours. This usually takes a minute or two — the comparison will appear here automatically.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-[var(--radius-large)] border border-border bg-background p-5">
            <div className="h-3 w-24 rounded bg-surface-muted" />
            <div className="mt-3 h-5 w-40 rounded bg-surface-muted" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-8 rounded bg-surface-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LocalComparisonUnavailable({ reason }: { reason: string }) {
  return (
    <section id="local-comparison" aria-labelledby="local-comparison-heading" className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted-foreground"><IconMapPinOff className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h2 id="local-comparison-heading" className="text-heading-3 text-foreground">Local comparison unavailable</h2>
          <p className="mt-1 text-body-small text-muted-foreground">{reason} Your audit score and findings are unaffected — they never depend on other practices.</p>
        </div>
      </div>
    </section>
  );
}
