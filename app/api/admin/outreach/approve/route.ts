import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.emailMessage.updateMany({
      where: {
        status: "QUEUED",
      },
      data: {
        status: "SENT",
      },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error("Admin outreach approve error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
