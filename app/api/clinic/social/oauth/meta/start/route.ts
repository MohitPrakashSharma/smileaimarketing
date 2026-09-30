import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireClinic } from "@/lib/clinicAuth";
import { metaConfigured, metaLoginUrl } from "@/lib/social/meta";
import { signState } from "@/lib/social/secrets";
import { backToSocial, cookieOpts, NONCE_COOKIE } from "../shared";

/** Sends a manager/owner to Facebook to connect the clinic's Page and Instagram. */
export async function GET(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return backToSocial(request, auth.status === 403 ? "forbidden" : "signed_out");
  if (!metaConfigured()) return backToSocial(request, "not_configured");

  const nonce = crypto.randomBytes(16).toString("base64url");
  const state = signState({ clinicId: auth.clinicId, userId: auth.userId, nonce });
  const res = NextResponse.redirect(metaLoginUrl(state));
  res.cookies.set(NONCE_COOKIE, nonce, cookieOpts(15 * 60));
  return res;
}
