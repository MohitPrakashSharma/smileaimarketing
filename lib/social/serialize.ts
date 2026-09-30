import type { Prisma } from "@prisma/client";

export const postInclude = {
  targets: { orderBy: { platform: "asc" } },
  createdBy: { select: { name: true } },
  media: { select: { id: true, source: true, prompt: true } },
} satisfies Prisma.SocialPostInclude;

export type PostWithTargets = Prisma.SocialPostGetPayload<{ include: typeof postInclude }>;
