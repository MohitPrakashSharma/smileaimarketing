import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { PLATFORMS } from "@/lib/social/platforms";
import { metaConfigured } from "@/lib/social/meta";

/** Accounts as the browser may see them — connection state, never tokens. */
async function listAccounts(clinicId: string) {
  const rows = await prisma.socialAccount.findMany({ where: { clinicId }, orderBy: { platform: "asc" } });
  return rows.map((a) => ({
    platform: a.platform,
    handle: a.handle,
    live: !!a.accessTokenEnc && process.env.SOCIAL_LIVE_DISABLED !== "true",
    connectedAt: a.accessTokenEnc ? a.connectedAt : null,
    lastError: a.accessTokenEnc ? a.lastError : null,
  }));
}

export async function GET(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ accounts: await listAccounts(auth.clinicId), metaAvailable: metaConfigured() });
}

const putSchema = z.object({
  accounts: z.array(z.object({ platform: z.enum(PLATFORMS), handle: z.string().trim().max(120) })).max(PLATFORMS.length),
});

/**
 * Records the clinic's handle per platform for platforms that aren't connected
 * live. An empty handle removes it. Live connections are managed by Connect/Disconnect.
 */
export async function PUT(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid accounts" }, { status: 400 });

  const live = new Set(
    (await prisma.socialAccount.findMany({ where: { clinicId: auth.clinicId, accessTokenEnc: { not: null } }, select: { platform: true } })).map((a) => a.platform)
  );

  await prisma.$transaction(
    parsed.data.accounts
      .filter(({ platform }) => !live.has(platform))
      .map(({ platform, handle }) => {
        const where = { clinicId_platform: { clinicId: auth.clinicId, platform } };
        const clean = handle.replace(/^@/, "");
        return clean
          ? prisma.socialAccount.upsert({ where, create: { clinicId: auth.clinicId, platform, handle: clean }, update: { handle: clean } })
          : prisma.socialAccount.deleteMany({ where: { clinicId: auth.clinicId, platform } });
      })
  );

  return NextResponse.json({ accounts: await listAccounts(auth.clinicId) });
}
