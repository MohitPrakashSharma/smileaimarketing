import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await prisma.emailMessage.findMany({
      include: {
        contact: {
          include: {
            business: {
              select: { website: true },
            },
          },
        },
        step: {
          select: { subject: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("Admin outreach GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
