import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { issueClinicInvite } from "@/lib/clinicInvite.server";

/** Issues a fresh invite link (the old one stops working) and re-sends the email. */
export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireClinic(request, "OWNER");
  if (auth instanceof NextResponse) return auth;
  try {
    const { userId } = await params;
    const target = await prisma.clinicUser.findFirst({ where: { id: userId, clinicId: auth.clinicId } });
    if (!target) return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    if (target.passwordHash) {
      return NextResponse.json({ error: `${target.name} has already set a password and can sign in.` }, { status: 409 });
    }
    if (!target.active) {
      return NextResponse.json({ error: "Reactivate this member before resending their invite." }, { status: 400 });
    }
    const invite = await issueClinicInvite(target.id);
    return NextResponse.json({ invite });
  } catch (error) {
    console.error("Clinic team invite error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
