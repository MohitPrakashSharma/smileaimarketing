import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";

const schema = z.object({ viewId: z.string().min(1).nullable() });

/** Set (or clear) the view that opens first for the signed-in admin. */
export async function PUT(request: Request) {
  try {
    const admin = await getAdminSession(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = schema.safeParse(await request.json());
    if (!result.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    const { viewId } = result.data;

    if (viewId) {
      // Any view the admin can see may be their default — their own or a shared one.
      const visible = await prisma.pipelineView.findFirst({
        where: { id: viewId, OR: [{ ownerId: admin.id }, { shared: true }] },
        select: { id: true },
      });
      if (!visible) return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    await prisma.user.update({ where: { id: admin.id }, data: { defaultPipelineViewId: viewId } });
    return NextResponse.json({ defaultViewId: viewId });
  } catch (error) {
    console.error("Pipeline default view PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
