import { NextResponse } from "next/server";
import { requireClinic } from "@/lib/clinicAuth";
import { getClinicMoneySettings } from "@/lib/clinicInvoice.server";

/** Currency and tax settings the invoice form needs to preview totals. */
export async function GET(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ clinic: await getClinicMoneySettings(auth.clinicId) });
}
