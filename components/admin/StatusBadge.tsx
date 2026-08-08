import React from "react";

type StatusType =
  | "DISCOVERED"
  | "VERIFIED"
  | "REJECTED"
  | "AUDITED"
  | "CONTACTED"
  | "ENGAGED"
  | "MEETING_REQUESTED"
  | "MEETING_CONFIRMED"
  | "CONVERTED"
  | "WON"
  | "LOST"
  | "ACTIVE"
  | "RUNNING"
  | "PAUSED"
  | "FAILED"
  | "COMPLETED"
  | "DRAFT"
  | "CONNECTED"
  | "DISCONNECTED"
  | "PENDING"
  | "SCHEDULED"
  | "SENT"
  | "AWAITING_APPROVAL"
  | "CANCELLED"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const normalized = status.toUpperCase().replace(/\s+/g, "_");

  let colorClasses = "bg-primary/10 border-primary/20 text-primary";
  let dotColor = "bg-primary";

  if (
    ["CONVERTED", "WON", "VERIFIED", "SENT", "COMPLETED", "CONNECTED", "ACTIVE", "RUNNING"].includes(normalized)
  ) {
    colorClasses = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    dotColor = "bg-emerald-400";
  } else if (
    ["DISCOVERED", "REQUESTED", "AUDITED", "SCHEDULED", "PAUSED", "AWAITING_APPROVAL", "MEETING_REQUESTED", "PENDING"].includes(normalized)
  ) {
    colorClasses = "bg-amber-500/10 border-amber-500/30 text-amber-400";
    dotColor = "bg-amber-400";
  } else if (
    ["DRAFT", "ENGAGED", "CONTACTED", "IN_PROGRESS", "MEETING_CONFIRMED"].includes(normalized)
  ) {
    colorClasses = "bg-sky-500/10 border-sky-500/30 text-sky-400";
    dotColor = "bg-sky-400";
  } else if (
    ["FAILED", "REJECTED", "LOST", "CANCELLED", "BOUNCED", "ERROR", "DISCONNECTED"].includes(normalized)
  ) {
    colorClasses = "bg-rose-500/10 border-rose-500/30 text-rose-400";
    dotColor = "bg-rose-400";
  }

  const label = status.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${colorClasses} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
}
