import { prisma } from "./prisma";

export interface AutoOutreachParams {
  businessId: string;
  /** Contact to send to, if already known (e.g. from discovery). Falls back to the business's first contact. */
  contactId?: string;
  /** Short, AI-written subject/opening from the audit's OpenAI summary — used instead of a generic template when available. */
  aiSubject?: string;
  aiOpening?: string;
}

export interface AutoOutreachResult {
  queued: boolean;
  reason?: string;
  emailMessageId?: string;
}

const DEFAULT_SUBJECT = "A quick visibility check for {{clinicName}}";
// Deliberately short — a two-line note, not a sales letter. The report itself carries the detail.
const DEFAULT_BODY =
  "Hi {{contactName}},\n\nWe ran a free visibility audit on {{clinicName}} in {{city}} — nearby patients are searching for a dentist right now, and this shows exactly where you're winning that search and where you're not.\n\nTakes 60 seconds to look through:";

/**
 * The single place that turns a real, verified contact into a drafted
 * outreach email awaiting admin approval. Called automatically once an
 * audit completes (from the discovery/analysis pipeline) or the moment a
 * contact is found/added for a business that already has a completed audit
 * — but only *drafts* the email (EmailMessage.status = QUEUED). Nothing is
 * actually sent until an admin approves it from /admin/outreach, which is
 * the only code path allowed to enqueue the real send
 * (app/api/admin/outreach/approve/route.ts).
 *
 * Never invents a recipient: if no verified contact exists yet, this is a
 * no-op that reports why, exactly like the rest of the pipeline's "real data
 * only" rule.
 */
export async function initiateAutomaticOutreach(params: AutoOutreachParams): Promise<AutoOutreachResult> {
  const business = await prisma.business.findUnique({
    where: { id: params.businessId },
    include: { contacts: true, campaign: true, audits: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!business) return { queued: false, reason: "Business not found" };

  const audit = business.audits[0];
  if (!audit || audit.status !== "COMPLETED") {
    return { queued: false, reason: "No completed audit yet" };
  }

  const contact = params.contactId
    ? business.contacts.find((c) => c.id === params.contactId) || business.contacts[0]
    : business.contacts[0];

  if (!contact) {
    return { queued: false, reason: "No verified contact found — Apollo and the practice website both came up empty" };
  }

  // Already sent (or in flight) for this contact — never double-send.
  const existingMessage = await prisma.emailMessage.findFirst({
    where: { contactId: contact.id, status: { in: ["QUEUED", "SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"] } },
  });
  if (existingMessage) {
    return { queued: false, reason: "Outreach already sent or in progress for this contact" };
  }

  let campaignId = business.campaignId;
  if (!campaignId) {
    const fallbackCampaign = await prisma.campaign.create({
      data: {
        name: `${business.city} Inbound Leads`,
        city: business.city,
        category: business.category,
        status: "ACTIVE",
      },
    });
    campaignId = fallbackCampaign.id;
    await prisma.business.update({ where: { id: business.id }, data: { campaignId } });
  }

  let sequence = await prisma.emailSequence.findFirst({ where: { campaignId } });
  if (!sequence) {
    sequence = await prisma.emailSequence.create({
      data: { campaignId, name: "Automated Audit Outreach" },
    });
  }

  // One step per business rather than one shared per campaign — lets the
  // AI-written subject/opening (real, per-practice) replace the generic
  // fallback copy without clobbering other businesses in the same campaign.
  const step = await prisma.emailStep.create({
    data: {
      sequenceId: sequence.id,
      stepDay: 0,
      subject: params.aiSubject || DEFAULT_SUBJECT,
      bodyTemplate: params.aiOpening ? `${params.aiOpening}\n\nTakes 60 seconds to look through:` : DEFAULT_BODY,
    },
  });

  const message = await prisma.emailMessage.create({
    data: { contactId: contact.id, stepId: step.id, status: "QUEUED" },
  });

  // Drafted only — not enqueued for sending. An admin must approve it from
  // /admin/outreach (app/api/admin/outreach/approve/route.ts) before this
  // contact ever receives a real email.
  await prisma.business.update({ where: { id: business.id }, data: { status: "OUTREACH_PENDING" } });

  // Attributed to whichever admin account exists — there's no separate
  // "system" actor in the schema, and this is just an activity-log note,
  // not a permission check. Skipped entirely if no user row exists at all.
  const systemUser = await prisma.user.findFirst({ select: { id: true } });
  if (systemUser) {
    await prisma.salesActivity.create({
      data: {
        businessId: business.id,
        userId: systemUser.id,
        // NOTE, not EMAIL — app/admin/businesses/[id]/page.tsx treats any
        // type:"EMAIL" activity as proof an email was actually sent. This
        // is a draft awaiting approval, not a send yet.
        type: "NOTE",
        content: `Outreach drafted for ${contact.email} — awaiting admin approval before sending.`,
      },
    });
  }

  return { queued: true, emailMessageId: message.id };
}
