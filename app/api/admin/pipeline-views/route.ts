import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { STARTER_VIEWS, viewConfigSchema, type PipelineViewDTO } from "@/lib/pipelineViews";
import { toViewDTO, viewInclude } from "@/lib/pipelineViewsServer";

/** The admin's own views plus everyone's shared views, starter views seeded on first visit. */
export async function GET(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { pipelineViewsSeeded: true, defaultPipelineViewId: true },
    });
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let defaultViewId = user.defaultPipelineViewId;
    if (!user.pipelineViewsSeeded) {
      defaultViewId = await prisma.$transaction(async (tx) => {
        // Re-check inside the transaction so two concurrent first loads can't double-seed.
        const fresh = await tx.user.findUnique({ where: { id: admin.id }, select: { pipelineViewsSeeded: true, defaultPipelineViewId: true } });
        if (fresh?.pipelineViewsSeeded) return fresh.defaultPipelineViewId;
        let firstId: string | null = null;
        for (const [i, v] of STARTER_VIEWS.entries()) {
          const created = await tx.pipelineView.create({
            data: { name: v.name, ownerId: admin.id, config: v.config, position: i },
          });
          firstId ??= created.id;
        }
        await tx.user.update({ where: { id: admin.id }, data: { pipelineViewsSeeded: true, defaultPipelineViewId: firstId } });
        return firstId;
      });
    }

    const rows = await prisma.pipelineView.findMany({
      where: { OR: [{ ownerId: admin.id }, { shared: true }] },
      include: viewInclude,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    // Own views first (in the user's order), then teammates' shared views.
    rows.sort((a, b) => Number(a.ownerId !== admin.id) - Number(b.ownerId !== admin.id));
    const views = rows.map((r) => toViewDTO(r, admin.id)).filter((v): v is PipelineViewDTO => v !== null);

    return NextResponse.json({ views, defaultViewId: views.some((v) => v.id === defaultViewId) ? defaultViewId : null });
  } catch (error) {
    console.error("Pipeline views GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  shared: z.boolean().optional(),
  config: viewConfigSchema,
});

export async function POST(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = createSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Invalid view" }, { status: 400 });

    const last = await prisma.pipelineView.findFirst({
      where: { ownerId: admin.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const view = await prisma.pipelineView.create({
      data: {
        name: result.data.name,
        shared: result.data.shared ?? false,
        config: result.data.config,
        ownerId: admin.id,
        position: (last?.position ?? -1) + 1,
      },
      include: viewInclude,
    });
    return NextResponse.json({ view: toViewDTO(view, admin.id) }, { status: 201 });
  } catch (error) {
    console.error("Pipeline views POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
