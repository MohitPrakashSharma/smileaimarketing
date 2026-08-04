import { prisma } from "./prisma";

export interface SendEmailParams {
  emailMessageId?: string;
  toEmail: string;
  toName: string;
  subject: string;
  bodyHtml: string;
  reportUrl: string;
  pdfUrl?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  mode: "test" | "live";
  recipient: string;
  messageId?: string;
  error?: string;
}

export async function sendOutreachEmail(params: SendEmailParams): Promise<EmailDispatchResult> {
  const sendMode = process.env.EMAIL_SEND_MODE || "test";
  const testRecipients = process.env.EMAIL_TEST_RECIPIENTS || "office@getfoundguru.com";

  const targetRecipient = sendMode === "live" ? params.toEmail : testRecipients.split(",")[0].trim();

  console.log(`[Email Service] Mode: ${sendMode.toUpperCase()} | Intended: ${params.toEmail} -> Actual: ${targetRecipient}`);

  try {
    // Check if recipient domain or email is in suppression table
    const suppressed = await prisma.suppressionRecord.findFirst({
      where: {
        OR: [
          { email: params.toEmail.toLowerCase() },
          { domain: params.toEmail.split("@")[1]?.toLowerCase() },
        ],
      },
    });

    if (suppressed) {
      console.warn(`[Email Service] Recipient ${params.toEmail} is SUPPRESSED. Skipping email dispatch.`);
      if (params.emailMessageId) {
        await prisma.emailMessage.update({
          where: { id: params.emailMessageId },
          data: { status: "BOUNCED" },
        });
      }
      return {
        success: false,
        mode: sendMode === "live" ? "live" : "test",
        recipient: targetRecipient,
        error: "Recipient address or domain is suppressed.",
      };
    }

    // Generate safe messageId identifier
    const simulatedMsgId = `msg_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // Update EmailMessage status in database
    if (params.emailMessageId) {
      await prisma.emailMessage.update({
        where: { id: params.emailMessageId },
        data: {
          status: "SENT",
          sentAt: new Date(),
          messageId: simulatedMsgId,
        },
      });
    }

    return {
      success: true,
      mode: sendMode === "live" ? "live" : "test",
      recipient: targetRecipient,
      messageId: simulatedMsgId,
    };
  } catch (error) {
    console.error("[Email Service] Dispatch error:", error);
    if (params.emailMessageId) {
      await prisma.emailMessage.update({
        where: { id: params.emailMessageId },
        data: { status: "BOUNCED" },
      });
    }
    return {
      success: false,
      mode: sendMode === "live" ? "live" : "test",
      recipient: targetRecipient,
      error: error instanceof Error ? error.message : "Unknown email failure",
    };
  }
}
