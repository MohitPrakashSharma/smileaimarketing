"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { IconBox, IconCalendarCheck, IconChevronRight, IconMegaphone, IconReceipt, IconUsers } from "@/components/icons";
import { useClinicSession } from "@/components/clinic/ClinicSessionContext";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";

type Overview = {
  currency: string;
  activePatients: number;
  upcomingVisits: { id: string; firstName: string; lastName: string; phone: string | null; nextVisitAt: string }[];
  lowStockCount: number;
  lowStockItems: { id: string; name: string; quantity: number; reorderLevel: number; unit: string }[];
  recentPosts: {
    id: string;
    topic: string;
    status: string;
    scheduledFor: string | null;
    publishedAt: string | null;
    createdAt: string;
    targets: { platform: string; status: string }[];
  }[];
  finances: {
    monthLabel: string;
    incomeCents: number;
    expensesCents: number;
    profitCents: number;
    unpaidCents: number;
    unpaidCount: number;
  } | null;
};

const PLATFORM_LABEL: Record<string, string> = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", TIKTOK: "TikTok", LINKEDIN: "LinkedIn" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, href, tone }: { label: string; value: string; href: string; tone?: "danger" | "growth" }) {
  return (
    <Link href={href} className="admin-card admin-card-hover block p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-display text-2xl font-bold ${tone === "danger" ? "text-danger" : tone === "growth" ? "text-growth-ink" : "text-foreground"}`}
      >
        {value}
      </p>
    </Link>
  );
}

function ViewAll({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground">
      View all <IconChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function ClinicOverviewPage() {
  const session = useClinicSession();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/clinic/overview")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        setData(body);
      })
      .catch((err: Error) => setError(err.message || "Couldn't load your overview"));
  }, []);

  const firstName = session.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-body-small text-muted-foreground">Here&apos;s what&apos;s happening at {session.clinicName}.</p>
      </div>

      {error ? (
        <div className="admin-card p-8 text-center text-sm font-semibold text-danger">{error}</div>
      ) : !data ? (
        <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className={`grid grid-cols-2 gap-3 ${data.finances ? "lg:grid-cols-4 xl:grid-cols-6" : "lg:grid-cols-3"}`}>
            <Stat label="Active patients" value={String(data.activePatients)} href="/clinic/patients" />
            <Stat label="Visits next 7 days" value={String(data.upcomingVisits.length)} href="/clinic/patients" />
            <Stat label="Low-stock items" value={String(data.lowStockCount)} href="/clinic/inventory" tone={data.lowStockCount > 0 ? "danger" : undefined} />
            {data.finances && (
              <>
                <Stat label={`Income · ${data.finances.monthLabel}`} value={formatMoney(data.finances.incomeCents, data.currency)} href="/clinic/accounting" />
                <Stat label={`Expenses · ${data.finances.monthLabel}`} value={formatMoney(data.finances.expensesCents, data.currency)} href="/clinic/accounting" />
                <Stat
                  label={`Profit · ${data.finances.monthLabel}`}
                  value={formatMoney(data.finances.profitCents, data.currency)}
                  href="/clinic/accounting"
                  tone={data.finances.profitCents < 0 ? "danger" : data.finances.profitCents > 0 ? "growth" : undefined}
                />
              </>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <AdminCard title="Upcoming visits" subtitle="Next 7 days" icon={IconCalendarCheck} action={<ViewAll href="/clinic/patients" />}>
              {data.upcomingVisits.length === 0 ? (
                <EmptyState
                  title="No visits in the next 7 days"
                  message="Set a patient's next visit date and it will show up here."
                  action={{ label: "Go to patients", onClick: () => router.push("/clinic/patients") }}
                />
              ) : (
                <ul className="divide-y divide-border/60">
                  {data.upcomingVisits.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {p.firstName} {p.lastName}
                        </p>
                        {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-foreground">
                        {new Date(p.nextVisitAt).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            <AdminCard title="Low stock" subtitle="At or below reorder level" icon={IconBox} count={data.lowStockCount} action={<ViewAll href="/clinic/inventory" />}>
              {data.lowStockItems.length === 0 ? (
                <EmptyState title="Stock levels look fine" message="Items at or below their reorder level will be listed here." />
              ) : (
                <ul className="divide-y divide-border/60">
                  {data.lowStockItems.map((i) => (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <p className="min-w-0 truncate text-sm font-semibold text-foreground">{i.name}</p>
                      <span className={`shrink-0 text-xs font-semibold ${i.quantity === 0 ? "text-danger" : "text-warning"}`}>
                        {i.quantity} {i.unit} left · reorder at {i.reorderLevel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>

            {data.finances && (
              <AdminCard title="Unpaid invoices" subtitle="Sent and awaiting payment" icon={IconReceipt} action={<ViewAll href="/clinic/accounting" />}>
                {data.finances.unpaidCount === 0 ? (
                  <EmptyState title="Nothing outstanding" message="Sent invoices that haven't been paid will be totalled here." />
                ) : (
                  <div>
                    <p className="font-display text-3xl font-bold text-foreground">{formatMoney(data.finances.unpaidCents, data.currency)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      across {data.finances.unpaidCount} invoice{data.finances.unpaidCount === 1 ? "" : "s"}
                    </p>
                  </div>
                )}
              </AdminCard>
            )}

            <AdminCard title="Recent social posts" icon={IconMegaphone} action={<ViewAll href="/clinic/social" />}>
              {data.recentPosts.length === 0 ? (
                <EmptyState
                  title="No posts yet"
                  message="Ask the social media assistant to write and publish your first post."
                  action={{ label: "Create a post", onClick: () => router.push("/clinic/social") }}
                />
              ) : (
                <ul className="divide-y divide-border/60">
                  {data.recentPosts.map((p) => (
                    <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 text-sm font-semibold text-foreground">{p.topic}</p>
                        <StatusBadge status={p.status} className="shrink-0" />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          {new Date(p.publishedAt ?? p.scheduledFor ?? p.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </span>
                        {p.targets.map((t) => (
                          <span key={t.platform} className={t.status === "FAILED" ? "font-semibold text-danger" : ""}>
                            {PLATFORM_LABEL[t.platform] ?? t.platform}
                            {t.status === "PUBLISHED" ? " ✓" : t.status === "FAILED" ? " failed" : t.status === "PENDING" ? " pending" : ""}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          </div>

          <AdminCard title="Quick actions">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Add a patient", href: "/clinic/patients", Icon: IconUsers },
                { label: "Update inventory", href: "/clinic/inventory", Icon: IconBox },
                ...(data.finances ? [{ label: "Create an invoice", href: "/clinic/accounting", Icon: IconReceipt }] : []),
                { label: "Publish a post", href: "/clinic/social", Icon: IconMegaphone },
              ].map((a) => (
                <Link
                  key={a.label}
                  href={a.href}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
                >
                  <a.Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  {a.label}
                </Link>
              ))}
            </div>
          </AdminCard>
        </>
      )}
    </div>
  );
}
