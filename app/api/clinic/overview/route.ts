import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasRole, requireClinic } from "@/lib/clinicAuth";

/** Everything on the clinic home page, from real records only. Money is left out for staff. */
export async function GET(request: Request) {
  const auth = await requireClinic(request);
  if (auth instanceof NextResponse) return auth;
  try {
    const clinicId = auth.clinicId;
    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const lowStockWhere = { clinicId, archived: false, quantity: { lte: prisma.inventoryItem.fields.reorderLevel } };

    const [activePatients, upcomingVisits, lowStockCount, lowStockItems, recentPosts, clinic] = await Promise.all([
      prisma.patient.count({ where: { clinicId, status: "ACTIVE" } }),
      prisma.patient.findMany({
        where: { clinicId, status: "ACTIVE", nextVisitAt: { gte: now, lte: weekAhead } },
        orderBy: { nextVisitAt: "asc" },
        take: 8,
        select: { id: true, firstName: true, lastName: true, phone: true, nextVisitAt: true },
      }),
      prisma.inventoryItem.count({ where: lowStockWhere }),
      prisma.inventoryItem.findMany({
        where: lowStockWhere,
        orderBy: { quantity: "asc" },
        take: 5,
        select: { id: true, name: true, quantity: true, reorderLevel: true, unit: true },
      }),
      prisma.socialPost.findMany({
        where: { clinicId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          topic: true,
          status: true,
          scheduledFor: true,
          publishedAt: true,
          createdAt: true,
          targets: { select: { platform: true, status: true } },
        },
      }),
      prisma.clinic.findUnique({ where: { id: clinicId }, select: { currency: true } }),
    ]);

    let finances = null;
    if (hasRole(auth, "MANAGER")) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const [ledger, unpaid] = await Promise.all([
        prisma.ledgerEntry.groupBy({
          by: ["type"],
          where: { clinicId, date: { gte: monthStart, lt: nextMonth } },
          _sum: { amountCents: true },
        }),
        prisma.invoice.aggregate({ where: { clinicId, status: "SENT" }, _sum: { totalCents: true }, _count: true }),
      ]);
      const income = ledger.find((l) => l.type === "INCOME")?._sum.amountCents ?? 0;
      const expenses = ledger.find((l) => l.type === "EXPENSE")?._sum.amountCents ?? 0;
      finances = {
        monthLabel: monthStart.toLocaleString("en-CA", { month: "long", year: "numeric" }),
        incomeCents: income,
        expensesCents: expenses,
        profitCents: income - expenses,
        unpaidCents: unpaid._sum.totalCents ?? 0,
        unpaidCount: unpaid._count,
      };
    }

    return NextResponse.json({
      currency: clinic?.currency ?? "CAD",
      activePatients,
      upcomingVisits,
      lowStockCount,
      lowStockItems,
      recentPosts,
      finances,
    });
  } catch (error) {
    console.error("Clinic overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
