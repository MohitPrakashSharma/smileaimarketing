import { NextResponse } from "next/server";
import { requireClinic } from "@/lib/clinicAuth";
import { connectMetaPage } from "@/lib/social/accounts";
import { exchangeCodeForUserToken, listPages, MetaError } from "@/lib/social/meta";
import { encryptSecret, verifyState } from "@/lib/social/secrets";
import { backToSocial, cookieOpts, NONCE_COOKIE, PENDING_COOKIE, readCookie } from "../shared";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return backToSocial(request, "signed_out");

  // The person closed Facebook's dialog or declined.
  if (params.get("error")) return backToSocial(request, "cancelled");

  const state = verifyState(params.get("state") ?? "");
  const nonce = readCookie(request, NONCE_COOKIE);
  if (!state || !nonce || state.nonce !== nonce || state.clinicId !== auth.clinicId || state.userId !== auth.userId) {
    return backToSocial(request, "expired");
  }
  const code = params.get("code");
  if (!code) return backToSocial(request, "cancelled");

  try {
    const userToken = await exchangeCodeForUserToken(code);
    const pages = await listPages(userToken);

    if (pages.length === 0) return clearNonce(backToSocial(request, "no_pages"));
    if (pages.length === 1) {
      const result = await connectMetaPage(auth.clinicId, auth.userId, pages[0]);
      return clearNonce(backToSocial(request, result.instagram ? "connected" : "connected_no_ig"));
    }

    // Several Pages: hold the (encrypted) user token briefly while they pick one.
    const res = clearNonce(backToSocial(request, "choose"));
    res.cookies.set(PENDING_COOKIE, encryptSecret(JSON.stringify({ clinicId: auth.clinicId, userToken })), cookieOpts(15 * 60));
    return res;
  } catch (err) {
    console.error("Meta connect error:", err instanceof MetaError ? `${err.message} (code ${err.code})` : err);
    return clearNonce(backToSocial(request, "failed"));
  }
}

function clearNonce(res: NextResponse) {
  res.cookies.set(NONCE_COOKIE, "", cookieOpts(0));
  return res;
}
