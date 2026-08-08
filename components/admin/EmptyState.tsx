import React from "react";
import { IconCheck } from "@/components/icons";

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

export function EmptyState({
  title = "All clear",
  message = "No items requiring attention right now.",
  action,
  compact = true,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center border border-dashed border-border/80 rounded-xl bg-surface/40 p-4 ${
        compact ? "min-h-[110px] py-4" : "min-h-[160px] py-8"
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
        <IconCheck className="h-4 w-4" />
      </div>
      <p className="mt-2 text-xs font-semibold text-foreground">{title}</p>
      {message && <p className="mt-0.5 text-[11px] text-muted-foreground">{message}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 inline-flex h-8 items-center rounded-lg bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
