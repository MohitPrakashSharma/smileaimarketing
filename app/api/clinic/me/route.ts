import { NextResponse } from "next/server";
import { requireClinic } from "@/lib/clinicAuth";

export async function GET(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ user: auth });
}
