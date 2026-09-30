/** Where a clinic user stands, derived from the account fields the APIs return. */
export type MemberStatus = "ACTIVE" | "INVITED" | "EXPIRED" | "DEACTIVATED";

export type MemberStatusInput = {
  active: boolean;
  hasPassword: boolean;
  inviteExpiresAt: string | Date | null;
};

export function memberStatus(m: MemberStatusInput): MemberStatus {
  if (!m.active) return "DEACTIVATED";
  if (m.hasPassword) return "ACTIVE";
  if (m.inviteExpiresAt && new Date(m.inviteExpiresAt) > new Date()) return "INVITED";
  return "EXPIRED";
}

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invite pending",
  EXPIRED: "Invite expired",
  DEACTIVATED: "Deactivated",
};

export const MEMBER_STATUS_TONE: Record<MemberStatus, { pill: string; dot: string }> = {
  ACTIVE: { pill: "bg-growth/10 border-growth/30 text-growth-ink", dot: "bg-growth" },
  INVITED: { pill: "bg-warning/10 border-warning/30 text-warning", dot: "bg-warning" },
  EXPIRED: { pill: "bg-danger/10 border-danger/30 text-danger", dot: "bg-danger" },
  DEACTIVATED: { pill: "bg-surface-muted border-border text-muted-foreground", dot: "bg-border-strong" },
};
