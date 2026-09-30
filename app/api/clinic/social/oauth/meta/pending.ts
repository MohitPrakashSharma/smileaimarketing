import { decryptSecret } from "@/lib/social/secrets";
import { PENDING_COOKIE, readCookie } from "./shared";

/** The user token held between the Facebook callback and choosing a Page. */
export function readPending(request: Request, clinicId: string): string | null {
  const sealed = readCookie(request, PENDING_COOKIE);
  if (!sealed) return null;
  try {
    const data = JSON.parse(decryptSecret(sealed)) as { clinicId: string; userToken: string };
    return data.clinicId === clinicId ? data.userToken : null;
  } catch {
    return null;
  }
}
