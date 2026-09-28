export type PipelineLead = {
  id: string;
  name: string;
  website: string;
  city: string;
  state?: string | null;
  country: string;
  status: string;
  opportunityScore: number;
  contactCount: number;
  contact: { name: string; email: string } | null;
  audit: { score: number; status: string } | null;
  outreachStatus: string | null;
  dealValueCents: number | null;
  wonAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Callback every view uses to change a lead's stage (drag, dropdown, bulk). */
export type MoveLead = (id: string, status: string) => Promise<void>;

// Values must match the Prisma BusinessStatus enum exactly (prisma/schema.prisma) —
// any value here that isn't a real enum member makes its column permanently
// empty and its status-change actions fail server-side.
export const STAGES = [
  { label: "Discovered", value: "DISCOVERED", dot: "bg-border-strong", text: "text-muted-foreground" },
  { label: "Qualified", value: "QUALIFIED", dot: "bg-primary", text: "text-primary-ink" },
  { label: "Auditing", value: "AUDITING", dot: "bg-secondary-mark", text: "text-secondary-ink" },
  { label: "Audited", value: "AUDITED", dot: "bg-secondary-ink", text: "text-secondary-ink" },
  { label: "Pending Approval", value: "OUTREACH_PENDING", dot: "bg-warning", text: "text-warning" },
  { label: "Contacted", value: "OUTREACH_ACTIVE", dot: "bg-warning", text: "text-warning" },
  { label: "Won", value: "CONVERTED", dot: "bg-growth", text: "text-growth-ink" },
  { label: "Disqualified", value: "DISQUALIFIED", dot: "bg-danger", text: "text-danger" },
] as const;

export type Stage = (typeof STAGES)[number];

export function stageOf(status: string): Stage {
  return STAGES.find((s) => s.value === status) ?? STAGES[0];
}

export const STALE_DAYS = 14;

export function daysSince(iso: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 86_400_000));
}

export function formatAge(iso: string) {
  const d = daysSince(iso);
  if (d === 0) return "today";
  if (d === 1) return "1 day ago";
  if (d < 30) return `${d} days ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "1 month ago" : `${m} months ago`;
}

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function nextAction(status: string) {
  switch (status) {
    case "DISCOVERED":
      return "Qualify lead";
    case "QUALIFIED":
      return "Run audit";
    case "AUDITING":
      return "Awaiting audit";
    case "AUDITED":
      return "Find contact";
    case "OUTREACH_PENDING":
      return "Approve email";
    case "OUTREACH_ACTIVE":
      return "Awaiting reply";
    case "CONVERTED":
      return "Onboard practice";
    case "DISQUALIFIED":
      return "Archived";
    default:
      return "Re-engage";
  }
}

export function StageDot({ stage }: { stage: Stage }) {
  return <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${stage.dot}`} />;
}

export function ScorePill({ score }: { score: number }) {
  const tone = score >= 70 ? "bg-growth-soft text-growth-ink" : score >= 40 ? "bg-accent-soft text-primary-ink" : "bg-danger/10 text-danger";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>{score}/100</span>;
}

/** Native select styled as a pill; changing it moves the lead. */
export function StageSelect({ lead, onMove, className = "" }: { lead: PipelineLead; onMove: MoveLead; className?: string }) {
  return (
    <select
      value={lead.status}
      onChange={(e) => void onMove(lead.id, e.target.value)}
      aria-label={`Stage for ${lead.name}`}
      className={`h-8 rounded-full border border-border bg-surface pl-3 pr-7 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`}
    >
      {STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
