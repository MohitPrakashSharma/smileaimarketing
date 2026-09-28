import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env.server";
import { logEngagementEvent } from "@/lib/events";
import { advanceStatus, verifyClickSignature } from "@/lib/emailTracking";

/** Click tracking: record the hit, then redirect to the link we signed at send time. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const target = url.searchParams.get("u") ?? "";
  const sig = url.searchParams.get("s") ?? "";

  // Unsigned or tampered links go home instead of wherever the query string says.
  if (!/^https?:\/\//.test(target) || !verifyClickSignature(id, target, sig)) {
    return NextResponse.redirect(env.APP_BASE_URL, 302);
  }

  try {
    const message = await prisma.emailMessage.findUnique({
      where: { id },
      select: { status: true, firstOpenedAt: true, firstClickedAt: true, contact: { select: { businessId: true } } },
    });
    if (message && message.status !== "QUEUED") {
      const now = new Date();
      await prisma.emailMessage.update({
        where: { id },
        data: {
          clickCount: { increment: 1 },
          firstClickedAt: message.firstClickedAt ?? now,
          // A click proves it was opened, even if the pixel was blocked.
          firstOpenedAt: message.firstOpenedAt ?? now,
          status: advanceStatus(message.status, "CLICKED"),
        },
      });
      await logEngagementEvent({
        eventType: "email_clicked",
        emailMessageId: id,
        businessId: message.contact.businessId,
        linkClicked: target,
        ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0].trim(),
        userAgent: request.headers.get("user-agent") ?? undefined,
      });
    }
  } catch (err) {
    console.error("[email tracking] click failed:", err);
  }
  return NextResponse.redirect(target, 302);
}
