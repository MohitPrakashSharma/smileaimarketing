import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const audits = await prisma.audit.findMany({
      include: {
        business: {
          select: { name: true, website: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ audits }, { status: 200 });
  } catch (error) {
    console.error("Admin audits GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
