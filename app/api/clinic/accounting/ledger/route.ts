import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, getClinicMoneySettings, ledgerBodySchema } from "@/lib/clinicInvoice.server";

function parseDay(s: string | null, endOfDay = false) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const d = new Date(`${s}T${endOfDay ? "23:59:59.999" : "00:00:00"}Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function csvCell(v: string | number | null | undefined) {
  const s = v == null ? "" : String(v);
  // Quote everything; neutralise leading formula characters so spreadsheets don't execute them.
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  try {
    const sp = new URL(request.url).searchParams;
    const type = sp.get("type");
    const category = sp.get("category");
    const from = parseDay(sp.get("from"));
    const to = parseDay(sp.get("to"), true);

    const where: Prisma.LedgerEntryWhereInput = {
      clinicId: auth.clinicId,
      ...(type === "INCOME" || type === "EXPENSE" ? { type } : {}),
      ...(category ? { category } : {}),
      ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: { invoice: { select: { id: true, number: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: sp.get("format") === "csv" ? undefined : 1000,
    });

    if (sp.get("format") === "csv") {
      const header = ["Date", "Type", "Category", "Description", "Counterparty", "Amount (incl. tax)", "Tax", "Net", "Invoice"];
      const rows = entries.map((e) =>
        [
          e.date.toISOString().slice(0, 10),
          e.type === "INCOME" ? "Income" : "Expense",
          e.category,
          e.description,
          e.counterparty,
          (e.amountCents / 100).toFixed(2),
          (e.taxCents / 100).toFixed(2),
          ((e.amountCents - e.taxCents) / 100).toFixed(2),
          e.invoice?.number,
        ]
          .map(csvCell)
          .join(",")
      );
      const csv = [header.map(csvCell).join(","), ...rows].join("\r\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ledger-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Categories already used, merged with the presets, so filters and the form list both.
    const used = await prisma.ledgerEntry.findMany({
      where: { clinicId: auth.clinicId },
      distinct: ["type", "category"],
      select: { type: true, category: true },
    });
    const merge = (preset: string[], t: "INCOME" | "EXPENSE") =>
      Array.from(new Set([...preset, ...used.filter((u) => u.type === t).map((u) => u.category)]));

    const clinic = await getClinicMoneySettings(auth.clinicId);
    return NextResponse.json({
      entries,
      clinic,
      categories: { INCOME: merge(INCOME_CATEGORIES, "INCOME"), EXPENSE: merge(EXPENSE_CATEGORIES, "EXPENSE") },
    });
  } catch (error) {
    console.error("Clinic ledger GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  try {
    const parsed = ledgerBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const entry = await prisma.ledgerEntry.create({
      data: { ...parsed.data, clinicId: auth.clinicId, createdById: auth.userId },
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Clinic ledger POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
