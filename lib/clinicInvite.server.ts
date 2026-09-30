import type { ClinicRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOutreachEmail } from "@/lib/email.server";
import { INVITE_TTL_MS, inviteUrl, newInviteToken } from "@/lib/clinicAuth";

const ROLE_LABEL: Record<ClinicRole, string> = { OWNER: "owner", MANAGER: "manager", STAFF: "team member" };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Issues a fresh invite token for a clinic user and emails the link. The link
 * is always returned too, so whoever invited can copy it if email is in test
 * mode or doesn't arrive.
 */
export async function issueClinicInvite(userId: string) {
  const token = newInviteToken();
  const user = await prisma.clinicUser.update({
    where: { id: userId },
    data: { inviteToken: token, inviteExpiresAt: new Date(Date.now() + INVITE_TTL_MS), invitedAt: new Date() },
    include: { clinic: { select: { name: true } } },
  });
  const link = inviteUrl(token);
  const clinic = escapeHtml(user.clinic.name);

  const email = await sendOutreachEmail({
    toEmail: user.email,
    toName: user.name,
    subject: `You're invited to ${user.clinic.name} on Smile AI Marketing`,
    html: `<p>Hi ${escapeHtml(user.name)},</p>
<p>You've been added to <strong>${clinic}</strong> as a ${ROLE_LABEL[user.role]} in the Smile AI Marketing dentist panel, where the clinic manages patients, inventory, accounting and social media.</p>
<p><a href="${link}">Set your password and sign in</a></p>
<p>This link expires in 7 days.</p>`,
    text: `You've been added to ${user.clinic.name} as a ${ROLE_LABEL[user.role]} in the Smile AI Marketing dentist panel.\n\nSet your password and sign in: ${link}\n\nThis link expires in 7 days.`,
  });

  return { link, emailed: email.success, emailMode: email.mode, emailError: email.error };
}
