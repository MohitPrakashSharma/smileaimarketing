import React from "react";
import { IconCircle } from "@/components/admin/AdminCard";

type IconComponent = (props: { className?: string }) => React.ReactElement;

/** One field in a details list: [icon circle] Label / value, with an optional right-hand aside. */
export function InfoRow({
  Icon,
  label,
  children,
  aside,
}: {
  Icon: IconComponent;
  label: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <IconCircle Icon={Icon} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{children}</div>
      </div>
      {aside && <div className="shrink-0 text-xs">{aside}</div>}
    </div>
  );
}

/** Grey pill for a label:value fact, a tag, or a small status. */
export function Chip({ label, children, className = "" }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs text-foreground ${className}`}>
      {label && <span className="text-muted-foreground">{label}:</span>}
      <span className="font-semibold">{children}</span>
    </span>
  );
}

/** Coloured dot + label for a record status, as in "Status in the system: Active". */
export function StatusLine({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  const color =
    tone === "good" ? "text-growth-ink" : tone === "warn" ? "text-warning" : tone === "bad" ? "text-danger" : "text-muted-foreground";
  const dot = tone === "good" ? "bg-growth" : tone === "warn" ? "bg-warning" : tone === "bad" ? "bg-danger" : "bg-border-strong";
  return (
    <span className={`inline-flex items-center gap-1.5 ${color}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      {children}
    </span>
  );
}
