import type { SocialPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "./secrets";
import type { MetaPage } from "./meta";

export type LiveAccount = { id: string; externalId: string; token: string; handle: string };

/**
 * Saves a chosen Facebook Page (and the Instagram business account linked to
 * it, if any) as the clinic's live Facebook/Instagram connection.
 */
export async function connectMetaPage(clinicId: string, userId: string, page: MetaPage) {
  const token = encryptSecret(page.access_token);
  const live = { accessTokenEnc: token, tokenExpiresAt: null, connectedById: userId, connectedAt: new Date(), lastError: null, lastErrorAt: null };

  await prisma.socialAccount.upsert({
    where: { clinicId_platform: { clinicId, platform: "FACEBOOK" } },
    create: { clinicId, platform: "FACEBOOK", handle: page.name, externalId: page.id, ...live },
    update: { handle: page.name, externalId: page.id, ...live },
  });

  const ig = page.instagram_business_account;
  if (ig) {
    const handle = ig.username ?? "Instagram account";
    await prisma.socialAccount.upsert({
      where: { clinicId_platform: { clinicId, platform: "INSTAGRAM" } },
      create: { clinicId, platform: "INSTAGRAM", handle, externalId: ig.id, ...live },
      update: { handle, externalId: ig.id, ...live },
    });
  } else {
    // This Page has no Instagram linked — drop any earlier live Instagram connection.
    await clearLiveConnection(clinicId, "INSTAGRAM");
  }
  return { facebook: page.name, instagram: ig?.username ?? null };
}

export async function clearLiveConnection(clinicId: string, platform: SocialPlatform) {
  await prisma.socialAccount.updateMany({
    where: { clinicId, platform },
    data: { accessTokenEnc: null, externalId: null, tokenExpiresAt: null, connectedById: null, lastError: null, lastErrorAt: null },
  });
}

/** The clinic's live connection for a platform, or null when it's only in test mode. */
export async function getLiveAccount(clinicId: string, platform: SocialPlatform): Promise<LiveAccount | null> {
  if (process.env.SOCIAL_LIVE_DISABLED === "true") return null;
  const acc = await prisma.socialAccount.findUnique({ where: { clinicId_platform: { clinicId, platform } } });
  if (!acc?.accessTokenEnc || !acc.externalId) return null;
  if (acc.tokenExpiresAt && acc.tokenExpiresAt < new Date()) return null;
  try {
    return { id: acc.id, externalId: acc.externalId, token: decryptSecret(acc.accessTokenEnc), handle: acc.handle };
  } catch {
    return null; // key changed — treated as disconnected
  }
}

export async function markAccountError(accountId: string, message: string) {
  await prisma.socialAccount.update({ where: { id: accountId }, data: { lastError: message.slice(0, 500), lastErrorAt: new Date() } });
}
