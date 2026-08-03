import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ businesses }, { status: 200 });
  } catch (error) {
    console.error("Admin businesses GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
