import { IconMapPin, IconMonitor, IconCheck } from "@/components/icons";

/**
 * The About hero's floating card: what a practice actually receives from us,
 * shown as three icons with a couple of words each rather than a paragraph.
 *
 * The lines describe what the report contains, not what it will achieve —
 * nothing here promises a ranking, an enquiry count or a revenue figure. The
 * timing is the same one quoted in the FAQ.
 */

const ROWS = [
  { Icon: IconMapPin, label: "Where patients find you" },
  { Icon: IconMonitor, label: "How your website performs" },
  { Icon: IconCheck, label: "What to fix first" },
];

export default function WhatYouGet({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <ul className="space-y-2.5">
        {ROWS.map(({ Icon, label }) => (
          <li key={label} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-accent-soft text-primary-ink">
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-body-small font-medium text-foreground">{label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-border-subtle pt-3 text-metadata text-muted-foreground">
        Free — usually ready in about two minutes.
      </p>
    </div>
  );
}
