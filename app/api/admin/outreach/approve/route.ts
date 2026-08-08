import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { outreachQueue } from "@/lib/queue";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const messageIds: string[] | undefined = body.messageIds;

    const queued = await prisma.emailMessage.findMany({
      where: body.approveAll
        ? { status: "QUEUED" }
        : { status: "QUEUED", id: { in: messageIds || [] } },
      select: { id: true },
    });

    for (const message of queued) {
      await outreachQueue.add(
        "send-outreach-email",
        { emailMessageId: message.id },
        { jobId: `outreach_${message.id}` }
      );
    }

    return NextResponse.json({ success: true, count: queued.length });
  } catch (error) {
    console.error("Admin outreach approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
