import { NextResponse } from "next/server";
import { clearClinicCookie } from "@/lib/clinicAuth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearClinicCookie(response);
  return response;
}
