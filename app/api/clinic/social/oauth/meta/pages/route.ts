import { NextResponse } from "next/server";
import { requireClinic } from "@/lib/clinicAuth";
import { listPages } from "@/lib/social/meta";
import { readPending } from "../pending";

/** Pages the person manages, for the "which Page?" picker. Never returns tokens. */
export async function GET(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const userToken = readPending(request, auth.clinicId);
  if (!userToken) return NextResponse.json({ error: "The Facebook connection expired. Connect again." }, { status: 410 });

  try {
    const pages = await listPages(userToken);
    return NextResponse.json({
      pages: pages.map((p) => ({ id: p.id, name: p.name, instagram: p.instagram_business_account?.username ?? null })),
    });
  } catch {
    return NextResponse.json({ error: "Couldn't load your Facebook Pages. Connect again." }, { status: 502 });
  }
}
