import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";
import { getClinicMoneySettings, monthKey, monthStart } from "@/lib/clinicInvoice.server";

/**
 * Totals for ?from=YYYY-MM&to=YYYY-MM (inclusive, max 36 months), all from
 * ledger entries — invoice income only counts once the invoice is paid.
 * Outstanding/overdue are point-in-time, not range-bound.
 */
export async function GET(request: Request) {
  const auth = await requireClinic(request, "MANAGER");
  if (auth instanceof NextResponse) return auth;
  try {
    const sp = new URL(request.url).searchParams;
    const now = new Date();
    const thisMonth = monthKey(now);
    const start = monthStart(sp.get("from") ?? thisMonth);
    const lastMonth = monthStart(sp.get("to") ?? sp.get("from") ?? thisMonth);
    if (!start || !lastMonth || lastMonth < start) {
      return NextResponse.json({ error: "Choose a valid month range." }, { status: 400 });
    }
    const end = new Date(Date.UTC(lastMonth.getUTCFullYear(), lastMonth.getUTCMonth() + 1, 1));

    const months: string[] = [];
    for (let d = new Date(start); d < end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
      months.push(monthKey(d));
      if (months.length > 36) return NextResponse.json({ error: "Pick a range of 36 months or less." }, { status: 400 });
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { clinicId: auth.clinicId, date: { gte: start, lt: end } },
      select: { type: true, category: true, amountCents: true, taxCents: true, date: true },
    });

    const totals = { incomeCents: 0, expenseCents: 0, taxCollectedCents: 0, taxPaidCents: 0 };
    const byMonth = new Map(months.map((m) => [m, { month: m, incomeCents: 0, expenseCents: 0 }]));
    const expenseByCategory = new Map<string, number>();
    const incomeByCategory = new Map<string, number>();

    for (const e of entries) {
      const row = byMonth.get(monthKey(e.date));
      if (e.type === "INCOME") {
        totals.incomeCents += e.amountCents;
        totals.taxCollectedCents += e.taxCents;
        if (row) row.incomeCents += e.amountCents;
        incomeByCategory.set(e.category, (incomeByCategory.get(e.category) ?? 0) + e.amountCents);
      } else {
        totals.expenseCents += e.amountCents;
        totals.taxPaidCents += e.taxCents;
        if (row) row.expenseCents += e.amountCents;
        expenseByCategory.set(e.category, (expenseByCategory.get(e.category) ?? 0) + e.amountCents);
      }
    }

    const unpaid = await prisma.invoice.findMany({
      where: { clinicId: auth.clinicId, status: "SENT" },
      select: { totalCents: true, dueDate: true },
    });
    const outstanding = { count: unpaid.length, cents: 0, overdueCount: 0, overdueCents: 0 };
    for (const inv of unpaid) {
      outstanding.cents += inv.totalCents;
      if (inv.dueDate && inv.dueDate < now) {
        outstanding.overdueCount += 1;
        outstanding.overdueCents += inv.totalCents;
      }
    }

    const sortDesc = (m: Map<string, number>) =>
      Array.from(m, ([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents);

    return NextResponse.json({
      clinic: await getClinicMoneySettings(auth.clinicId),
      range: { from: months[0], to: months[months.length - 1] },
      entryCount: entries.length,
      totals: { ...totals, profitCents: totals.incomeCents - totals.expenseCents },
      outstanding,
      expenseByCategory: sortDesc(expenseByCategory),
      incomeByCategory: sortDesc(incomeByCategory),
      months: Array.from(byMonth.values()).map((m) => ({ ...m, profitCents: m.incomeCents - m.expenseCents })),
    });
  } catch (error) {
    console.error("Clinic accounting summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
