import { prisma } from "./prisma";

export interface LogEventParams {
  eventType: string;
  emailMessageId?: string;
  businessId?: string;
  auditId?: string;
  linkClicked?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logEngagementEvent(params: LogEventParams) {
  try {
    const event = await prisma.engagementEvent.create({
      data: {
        eventType: params.eventType,
        emailMessageId: params.emailMessageId || null,
        businessId: params.businessId || null,
        auditId: params.auditId || null,
        linkClicked: params.linkClicked || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
    return event;
  } catch (err) {
    console.error(`[Analytics Event Error] Failed to log event ${params.eventType}:`, err);
    return null;
  }
}
