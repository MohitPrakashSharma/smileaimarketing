import { NextResponse } from "next/server";
import { requireClinic } from "@/lib/clinicAuth";
import { clearLiveConnection } from "@/lib/social/accounts";

/** Disconnect Facebook + Instagram: posts to them go back to test mode. */
export async function DELETE(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  await clearLiveConnection(auth.clinicId, "FACEBOOK");
  await clearLiveConnection(auth.clinicId, "INSTAGRAM");
  return NextResponse.json({ ok: true });
}
