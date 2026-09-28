import "server-only";
import type { Prisma } from "@prisma/client";
import { parseViewConfig, type PipelineViewDTO } from "@/lib/pipelineViews";

export const viewInclude = { owner: { select: { name: true } } } as const;

type ViewRow = Prisma.PipelineViewGetPayload<{ include: typeof viewInclude }>;

/** Row → client shape. Rows whose stored config no longer validates are dropped (null). */
export function toViewDTO(view: ViewRow, userId: string): PipelineViewDTO | null {
  const config = parseViewConfig(view.config);
  if (!config) return null;
  return {
    id: view.id,
    name: view.name,
    shared: view.shared,
    position: view.position,
    config,
    editable: view.ownerId === userId,
    ownerName: view.owner.name,
  };
}
