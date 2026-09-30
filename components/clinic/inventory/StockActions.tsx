"use client";

import type { StockAction } from "./StockDialog";

const btn =
  "inline-flex h-8 items-center rounded-full border border-border bg-surface px-3 text-[11px] font-bold text-foreground transition-colors hover:border-border-strong hover:bg-surface-muted disabled:opacity-50";

export function StockActions({ onAction, disabled }: { onAction: (a: StockAction) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className={btn} disabled={disabled} onClick={() => onAction("RECEIVED")}>
        + Receive
      </button>
      <button type="button" className={btn} disabled={disabled} onClick={() => onAction("USED")}>
        − Use
      </button>
      <button type="button" className={btn} disabled={disabled} onClick={() => onAction("ADJUSTMENT")}>
        Adjust
      </button>
    </div>
  );
}
