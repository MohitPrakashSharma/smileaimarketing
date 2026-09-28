import { prisma } from "@/lib/prisma";
import { logEngagementEvent } from "@/lib/events";
import { advanceStatus } from "@/lib/emailTracking";

// Smallest transparent GIF.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** Open-tracking pixel. Always answers with the image — a tracking failure must never show a broken image. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const message = await prisma.emailMessage.findUnique({
      where: { id },
      select: { status: true, firstOpenedAt: true, contact: { select: { businessId: true } } },
    });
    if (message && message.status !== "QUEUED") {
      const now = new Date();
      await prisma.emailMessage.update({
        where: { id },
        data: {
          openCount: { increment: 1 },
          firstOpenedAt: message.firstOpenedAt ?? now,
          lastOpenedAt: now,
          status: advanceStatus(message.status, "OPENED"),
        },
      });
      await logEngagementEvent({
        eventType: "email_opened",
        emailMessageId: id,
        businessId: message.contact.businessId,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim(),
        userAgent: request.headers.get("user-agent") ?? undefined,
      });
    }
  } catch (err) {
    console.error("[email tracking] open failed:", err);
  }
  return new Response(new Uint8Array(PIXEL), {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}
