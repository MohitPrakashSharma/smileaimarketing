import { prisma } from "@/lib/prisma";
import { getLiveAccount, markAccountError } from "./accounts";
import { facebookPostMetrics, instagramMediaMetrics, MetaError, type Metrics } from "./meta";

export const SOCIAL_METRICS_JOB = "sync-social-metrics";
// Engagement settles within a few weeks; older posts aren't re-read.
const WINDOW_DAYS = 30;

/**
 * Pulls real engagement for live-published targets from the platforms and
 * stores it on the target. Only numbers the platform returns are written.
 */
export async function syncMetrics(filter: { postId?: string; clinicId?: string } = {}) {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const targets = await prisma.socialPostTarget.findMany({
    where: {
      mode: "live",
      status: "PUBLISHED",
      externalId: { not: null },
      platform: { in: ["FACEBOOK", "INSTAGRAM"] },
      ...(filter.postId ? { postId: filter.postId } : { publishedAt: { gte: since } }),
      ...(filter.clinicId ? { post: { clinicId: filter.clinicId } } : {}),
    },
    include: { post: { select: { clinicId: true } } },
  });

  let updated = 0;
  for (const t of targets) {
    const account = await getLiveAccount(t.post.clinicId, t.platform);
    if (!account) continue;
    try {
      const m: Metrics = t.platform === "FACEBOOK" ? await facebookPostMetrics(t.externalId!, account.token) : await instagramMediaMetrics(t.externalId!, account.token);
      await prisma.socialPostTarget.update({
        where: { id: t.id },
        data: {
          ...(m.impressions !== undefined && { impressions: m.impressions }),
          ...(m.likes !== undefined && { likes: m.likes }),
          ...(m.comments !== undefined && { comments: m.comments }),
          ...(m.shares !== undefined && { shares: m.shares }),
          metricsUpdatedAt: new Date(),
        },
      });
      updated++;
    } catch (err) {
      // Only a dead token means the clinic must reconnect; a stat we lack permission for doesn't.
      if (err instanceof MetaError && err.code === 190) await markAccountError(account.id, err.message);
      else console.warn(`[Social metrics] ${t.platform} ${t.externalId}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { checked: targets.length, updated };
}
