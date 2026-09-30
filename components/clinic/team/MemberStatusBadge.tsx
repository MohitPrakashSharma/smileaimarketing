import { MEMBER_STATUS_LABEL, MEMBER_STATUS_TONE, type MemberStatus } from "./memberStatus";

/** Same pill as the admin StatusBadge, with the member-specific wording. */
export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const tone = MEMBER_STATUS_TONE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${tone.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      <span>{MEMBER_STATUS_LABEL[status]}</span>
    </span>
  );
}
