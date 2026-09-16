/**
 * Native <details>/<summary> accordion styled for the brand. Server-safe; no
 * JS beyond the browser's own disclosure behaviour.
 */
export default function FaqList({ items, className = "" }: { items: { q: string; a: string }[]; className?: string }) {
  return (
    <div className={`divide-y divide-border border-y border-border ${className}`}>
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-4 text-left font-display text-[1.125rem] font-semibold text-foreground marker:content-none transition-colors duration-[var(--duration-fast)] hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:py-[1.125rem] sm:text-[1.1875rem] [&::-webkit-details-marker]:hidden">
            {item.q}
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition-[transform,background-color,border-color,color] duration-[var(--duration-normal)] ease-[var(--ease-out)] group-open:rotate-45 group-open:border-primary group-open:bg-primary group-open:text-primary-foreground"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
          </summary>
          <p className="max-w-2xl pb-5 text-body text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
