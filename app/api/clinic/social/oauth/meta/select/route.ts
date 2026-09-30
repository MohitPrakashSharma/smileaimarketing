import { NextResponse } from "next/server";
import { z } from "zod";
import { requireClinic } from "@/lib/clinicAuth";
import { connectMetaPage } from "@/lib/social/accounts";
import { listPages } from "@/lib/social/meta";
import { readPending } from "../pending";
import { cookieOpts, PENDING_COOKIE } from "../shared";

const schema = z.object({ pageId: z.string().regex(/^\d+$/) });

export async function POST(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a Page." }, { status: 400 });

  const userToken = readPending(request, auth.clinicId);
  if (!userToken) return NextResponse.json({ error: "The Facebook connection expired. Connect again." }, { status: 410 });

  try {
    // Re-read from Facebook rather than trusting anything from the browser.
    const page = (await listPages(userToken)).find((p) => p.id === parsed.data.pageId);
    if (!page) return NextResponse.json({ error: "That Page isn't available to this Facebook account." }, { status: 400 });
    const result = await connectMetaPage(auth.clinicId, auth.userId, page);
    const res = NextResponse.json({ connected: result });
    res.cookies.set(PENDING_COOKIE, "", cookieOpts(0));
    return res;
  } catch (err) {
    console.error("Meta select page error:", err);
    return NextResponse.json({ error: "Couldn't connect that Page. Try again." }, { status: 502 });
  }
}
