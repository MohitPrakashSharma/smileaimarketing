import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { issueClinicInvite } from "@/lib/clinicInvite.server";

/** Issues a fresh invite link (the old one stops working) and re-sends the email. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id, userId } = await params;

    const user = await prisma.clinicUser.findFirst({ where: { id: userId, clinicId: id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.passwordHash) {
      return NextResponse.json({ error: `${user.name} has already set a password and can sign in.` }, { status: 409 });
    }

    const invite = await issueClinicInvite(userId);
    return NextResponse.json({ invite });
  } catch (error) {
    console.error("Admin clinic invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
