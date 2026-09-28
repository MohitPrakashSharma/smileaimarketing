import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { viewConfigSchema } from "@/lib/pipelineViews";
import { toViewDTO, viewInclude } from "@/lib/pipelineViewsServer";

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    shared: z.boolean().optional(),
    config: viewConfigSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.shared !== undefined || v.config !== undefined, { message: "Nothing to update" });

/** Only the owner may change or delete a view; teammates can duplicate shared ones instead. */
async function ownedView(id: string, userId: string) {
  const view = await prisma.pipelineView.findUnique({ where: { id }, select: { ownerId: true } });
  if (!view) return { error: NextResponse.json({ error: "View not found" }, { status: 404 }) };
  if (view.ownerId !== userId) return { error: NextResponse.json({ error: "Only the view's owner can change it" }, { status: 403 }) };
  return { error: null };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const result = patchSchema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

    const { error } = await ownedView(id, admin.id);
    if (error) return error;

    const view = await prisma.pipelineView.update({ where: { id }, data: result.data, include: viewInclude });
    return NextResponse.json({ view: toViewDTO(view, admin.id) });
  } catch (error) {
    console.error("Pipeline view PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const { error } = await ownedView(id, admin.id);
    if (error) return error;

    // Users who had it as default fall back to no default (FK is ON DELETE SET NULL).
    await prisma.pipelineView.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Pipeline view DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
