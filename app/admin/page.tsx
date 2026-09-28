"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconCalendarCheck,
  IconSearch,
  IconStorefront,
  IconUsers,
  IconClipboardCheck,
  IconChat,
  IconTrendingUp,
  IconSparkle,
  IconChevronRight,
  IconMapPin,
  IconTarget,
  IconLink,
  IconGauge,
  IconArrowUpRight,
} from "@/components/icons";
import { AdminCard, IconCircle } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Sparkline } from "@/components/admin/Sparkline";
import { IconButton } from "@/components/admin/IconButton";
import { StatusLine } from "@/components/admin/InfoRow";
import Eyebrow from "@/components/Eyebrow";

interface BusinessRow {
  id: string;
  name: string;
  website: string;
  city: string;
  country: string;
  status: string;
  opportunityScore: number;
  contact: { name: string; email: string; phone: string | null; source: string } | null;
  audit: { score: number; status: string; pdfStatus: string; publicToken: string } | null;
  outreachStatus: string | null;
  createdAt: string;
}

interface AppointmentItem {
  id: string;
  type: "ONLINE" | "IN_PERSON";
  status: string;
  business?: { id: string; name: string; city?: string };
}

interface IntegrationStatusItem {
  key: string;
  name: string;
  status: string;
  details: string;
}

interface CampaignItem {
  id: string;
  name: string;
  city: string;
  state: string | null;
  category: string;
  status: string;
  maxBusinesses: number;
  _count: { businesses: number };
  businesses: { status: string }[];
}

interface FunnelData {
  won: { count: number; revenueCents: number };
}

type Recommendation = {
  title: string;
  detail: string;
  href: string;
  cta: string;
  Icon: (props: { className?: string }) => React.ReactElement;
};

const SENT_STATUSES = new Set(["QUEUED", "SENT", "DELIVERED", "OPENED", "CLICKED", "REPLIED"]);
const ENGAGED_STATUSES = new Set(["OPENED", "CLICKED", "REPLIED"]);
const AUDITED_OR_LATER = new Set(["AUDITED", "OUTREACH_PENDING", "OUTREACH_ACTIVE", "CONVERTED"]);
const WEEKS = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Brand hues as raw values for SVG strokes (Tailwind classes can't reach SVG attributes).
const BLUE = "#3b67b2";

function greeting(now: Date) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);
}

function pct(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

export default function AdminOverviewPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatusItem[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [now] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchOverviewData = useCallback(async () => {
    try {
      const [bRes, apRes, iRes, cRes, fRes] = await Promise.all([
        fetch("/api/admin/businesses"),
        fetch("/api/admin/appointments"),
        fetch("/api/admin/integrations/status"),
        fetch("/api/admin/campaigns"),
        fetch("/api/admin/analytics/funnel"),
      ]);
      const [bData, apData, iData, cData, fData] = await Promise.all([
        bRes.json(),
        apRes.json(),
        iRes.json(),
        cRes.json(),
        fRes.json(),
      ]);
      if (bRes.ok) setBusinesses(bData.businesses || []);
      if (apRes.ok) setAppointments(apData.appointments || []);
      if (iRes.ok) setIntegrations(iData.integrations || []);
      if (cRes.ok) setCampaigns(cData.campaigns || []);
      if (fRes.ok) setFunnel(fData);
    } catch (err) {
      console.error("Failed to load overview data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchOverviewData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchOverviewData]);

  const filtered = useMemo(() => {
    if (!search) return businesses;
    const q = search.toLowerCase();
    return businesses.filter((b) => b.name.toLowerCase().includes(q) || b.city.toLowerCase().includes(q));
  }, [businesses, search]);

  const stats = useMemo(() => {
    const total = businesses.length;
    const withContact = businesses.filter((b) => b.contact);
    const audited = businesses.filter((b) => b.audit?.status === "COMPLETED");
    const sent = businesses.filter((b) => b.outreachStatus && SENT_STATUSES.has(b.outreachStatus));
    const engaged = businesses.filter((b) => b.outreachStatus && ENGAGED_STATUSES.has(b.outreachStatus));
    const avgScore = audited.length ? Math.round(audited.reduce((s, b) => s + (b.audit?.score ?? 0), 0) / audited.length) : 0;

    // Practices discovered per week, oldest first, for the trend line.
    const weekly = Array.from({ length: WEEKS }, () => 0);
    for (const b of businesses) {
      const age = Math.floor((now.getTime() - new Date(b.createdAt).getTime()) / WEEK_MS);
      if (age >= 0 && age < WEEKS) weekly[WEEKS - 1 - age]++;
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonth = businesses.filter((b) => new Date(b.createdAt).getTime() >= monthStart).length;

    const meetingBusinessIds = new Set(
      appointments.filter((a) => a.status !== "CANCELLED" && a.business?.id).map((a) => a.business!.id)
    );
    const won = businesses.filter((b) => b.status === "CONVERTED").length;

    return {
      total,
      thisMonth,
      weekly,
      contacts: withContact.length,
      audited: audited.length,
      avgScore,
      sent: sent.length,
      engaged: engaged.length,
      meetings: meetingBusinessIds.size,
      won: Math.max(won, funnel?.won.count ?? 0),
      revenueCents: funnel?.won.revenueCents ?? 0,
      pipelineAudited: businesses.filter((b) => AUDITED_OR_LATER.has(b.status) || b.audit?.status === "COMPLETED").length,
      lowScoring: audited.filter((b) => (b.audit?.score ?? 100) < 50).length,
      auditedNotContacted: businesses.filter((b) => b.audit?.status === "COMPLETED" && b.contact && !b.outreachStatus).length,
      missingContact: total - withContact.length,
    };
  }, [businesses, appointments, funnel, now]);

  const meetingsRequested = appointments.filter((ap) => ap.status === "REQUESTED");
  const integrationIssues = integrations.filter((i) => i.status === "MISSING" || i.status === "MOCKED" || i.status === "TEST_MODE");

  // Next-best actions, derived from the live pipeline — not canned copy.
  const recommendations = useMemo<Recommendation[]>(() => {
    const recs: Recommendation[] = [];
    if (meetingsRequested.length > 0)
      recs.push({
        title: `Confirm ${meetingsRequested.length} meeting request${meetingsRequested.length === 1 ? "" : "s"}`,
        detail: "Practices asked for a consultation — book them while intent is high.",
        href: "/admin/meetings",
        cta: "Schedule",
        Icon: IconCalendarCheck,
      });
    if (stats.auditedNotContacted > 0)
      recs.push({
        title: `Send outreach to ${stats.auditedNotContacted} audited practice${stats.auditedNotContacted === 1 ? "" : "s"}`,
        detail: "Their audit is ready and a contact is verified — nothing has been sent yet.",
        href: "/admin/outreach",
        cta: "Review",
        Icon: IconChat,
      });
    if (stats.lowScoring > 0)
      recs.push({
        title: `${stats.lowScoring} practice${stats.lowScoring === 1 ? "" : "s"} scored under 50`,
        detail: "The weakest sites make the strongest pitch — prioritise them.",
        href: "/admin/audits",
        cta: "Open",
        Icon: IconTrendingUp,
      });
    if (stats.missingContact > 0)
      recs.push({
        title: `Find decision-makers for ${stats.missingContact} practice${stats.missingContact === 1 ? "" : "s"}`,
        detail: "No verified contact yet, so these leads can't enter outreach.",
        href: "/admin/businesses",
        cta: "Find",
        Icon: IconUsers,
      });
    if (integrationIssues.length > 0)
      recs.push({
        title: `Connect ${integrationIssues.length} integration${integrationIssues.length === 1 ? "" : "s"}`,
        detail: `${integrationIssues.map((i) => i.name).slice(0, 2).join(", ")}${integrationIssues.length > 2 ? "…" : ""} still on fallback or test mode.`,
        href: "/admin/integrations",
        cta: "Fix",
        Icon: IconLink,
      });
    if (stats.total === 0)
      recs.push({
        title: "Launch your first campaign",
        detail: "Pick a city and the engine will discover and audit practices for you.",
        href: "/admin/campaigns",
        cta: "Start",
        Icon: IconTarget,
      });
    return recs.slice(0, 4);
  }, [meetingsRequested.length, integrationIssues, stats]);

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((b) => b.id)));
  };

  const runBulk = async (action: "audit" | "outreach") => {
    setBulkLoading(true);
    setMessage("");
    const ids = Array.from(selected);
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetch(action === "audit" ? "/api/admin/audits/run" : `/api/admin/businesses/${id}/outreach`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: action === "audit" ? JSON.stringify({ businessId: id }) : undefined,
        });
        if (res.ok) ok++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setMessage(
      action === "audit"
        ? `Queued audits for ${ok} practice${ok === 1 ? "" : "s"}${failed ? `, ${failed} failed` : ""}.`
        : `Sent outreach for ${ok} practice${ok === 1 ? "" : "s"}${failed ? `, ${failed} skipped (no verified contact or already sent)` : ""}.`
    );
    setSelected(new Set());
    setBulkLoading(false);
    await fetchOverviewData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />
      </div>
    );
  }

  const kpis = [
    {
      label: "Practices Discovered",
      value: stats.total.toLocaleString(),
      note: `+${stats.thisMonth} this month`,
      Icon: IconStorefront,
      bar: "bg-primary",
      visual: <Sparkline values={stats.weekly} color={BLUE} />,
    },
    {
      label: "Contacts Found",
      value: stats.contacts.toLocaleString(),
      note: `${pct(stats.contacts, stats.total)}% coverage`,
      Icon: IconUsers,
      bar: "bg-growth",
      progress: pct(stats.contacts, stats.total),
    },
    {
      label: "Audits Completed",
      value: stats.audited.toLocaleString(),
      note: stats.audited ? `Avg. score ${stats.avgScore}/100` : "None yet",
      Icon: IconClipboardCheck,
      bar: "bg-primary",
      progress: pct(stats.audited, stats.total),
    },
    {
      label: "Outreach Sent",
      value: stats.sent.toLocaleString(),
      note: stats.sent ? `${pct(stats.engaged, stats.sent)}% opened or replied` : "Nothing sent yet",
      Icon: IconChat,
      bar: "bg-secondary-mark",
      progress: pct(stats.engaged, stats.sent),
    },
    {
      label: "Revenue Won",
      value: formatCurrency(stats.revenueCents),
      note: `${stats.won} practice${stats.won === 1 ? "" : "s"} converted`,
      Icon: IconTrendingUp,
      bar: "bg-growth",
      progress: pct(stats.won, stats.total),
    },
  ];

  const funnelStages = [
    { label: "Practices Discovered", count: stats.total, bar: "bg-primary", hint: "Trust" },
    { label: "Audit Delivered", count: stats.pipelineAudited, bar: "bg-primary-ink", hint: "Trust" },
    { label: "Outreach Engaged", count: stats.sent, bar: "bg-secondary-mark", hint: "Engagement" },
    { label: "Consultation Booked", count: stats.meetings, bar: "bg-secondary-ink", hint: "Engagement" },
    { label: "Client Won", count: stats.won, bar: "bg-growth", hint: "Success" },
  ];
  const funnelMax = Math.max(funnelStages[0].count, 1);

  return (
    <div className="space-y-6">
      {/* Welcome — mirrors the public hero: eyebrow, Outfit headline, navy data card */}
      <section className="admin-card overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div>
            <Eyebrow>{now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</Eyebrow>
            <h1 className="mt-4 font-display text-[32px] font-bold leading-[1.08] tracking-[-0.03em] text-foreground sm:text-[40px]">
              {greeting(now)}, <span className="text-secondary-ink">Smile AI team.</span>
            </h1>
            <p className="mt-3 max-w-xl font-copy text-base text-muted-foreground">
              Your growth engine discovered <strong className="font-semibold text-foreground">{stats.thisMonth}</strong> new
              practice {stats.thisMonth === 1 ? "opportunity" : "opportunities"} this month
              {stats.auditedNotContacted > 0 && (
                <>
                  {" "}— <strong className="font-semibold text-foreground">{stats.auditedNotContacted}</strong> audited and ready for outreach
                </>
              )}
              .
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link
                href="/admin/campaigns"
                className="group inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                New Campaign
                <IconChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/admin/pipeline"
                className="inline-flex h-11 items-center rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:border-foreground"
              >
                View Pipeline
              </Link>
            </div>
          </div>

          <div className="overflow-hidden rounded-[20px] border border-border shadow-md">
            <div className="flex items-end justify-between gap-3 bg-background-dark px-5 py-4 text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-on-dark">Pipeline snapshot</p>
                <p className="mt-0.5 font-display text-base font-semibold">All campaigns</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-semibold text-[var(--color-growth-on-dark)]">{formatCurrency(stats.revenueCents)}</p>
                <p className="text-[11px] text-[var(--color-text-on-dark-muted)]">revenue won</p>
              </div>
            </div>
            <ul className="divide-y divide-border bg-surface">
              {[
                { label: "In pipeline", value: stats.total - stats.won, Icon: IconStorefront },
                { label: "Audits delivered", value: stats.pipelineAudited, Icon: IconClipboardCheck },
                { label: "Meetings booked", value: stats.meetings, Icon: IconCalendarCheck },
                { label: "Clients won", value: stats.won, Icon: IconTrendingUp },
              ].map((row) => (
                <li key={row.label} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-muted text-primary-ink">
                    <row.Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-foreground">{row.label}</span>
                  <span className="font-semibold text-muted-foreground">{row.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="admin-card admin-card-hover flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <IconCircle Icon={k.Icon} />
              {k.visual}
            </div>
            <p className="mt-4 text-xs font-semibold text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-[28px] font-bold leading-none tracking-tight text-foreground">{k.value}</p>
            {typeof k.progress === "number" && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div className={`${k.bar} h-full rounded-full`} style={{ width: `${Math.max(k.progress, 2)}%` }} />
              </div>
            )}
            <p className="mt-2 text-[11px] font-semibold text-muted-foreground">{k.note}</p>
          </div>
        ))}
      </div>

      {/* Funnel + AI assistant */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <AdminCard
          title="Practice Acquisition Funnel"
          subtitle="From discovery to signed client, across every campaign"
          icon={IconGauge}
          action={<IconButton Icon={IconArrowUpRight} label="Open analytics" href="/admin/analytics" />}
        >
          <ol className="space-y-3.5">
            {funnelStages.map((stage, i) => {
              const width = Math.max(pct(stage.count, funnelMax), stage.count > 0 ? 6 : 0);
              const prev = i > 0 ? funnelStages[i - 1].count : null;
              return (
                <li key={stage.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
                    <span className="font-semibold text-foreground">
                      <span className="mr-2 text-text-faint">{String(i + 1).padStart(2, "0")}</span>
                      {stage.label}
                    </span>
                    <span className="flex items-baseline gap-2">
                      {prev !== null && prev > 0 && (
                        <span className="text-[11px] font-semibold text-muted-foreground">{pct(stage.count, prev)}% of prev.</span>
                      )}
                      <span className="font-display text-base font-semibold text-foreground">{stage.count}</span>
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                    <div className={`${stage.bar} h-full rounded-full transition-[width] duration-700`} style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-5 flex flex-wrap gap-4 border-t border-border/60 pt-4 text-[11px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> Trust</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-secondary" /> Engagement</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-growth" /> Success</span>
          </div>
        </AdminCard>

        <section className="flex flex-col rounded-[20px] bg-background-dark p-6 text-white shadow-md">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-accent-on-dark">
                  <IconSparkle className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">AI Growth Recommendations</h2>
                  <p className="text-xs text-[var(--color-text-on-dark-muted)]">Next best actions from your live pipeline</p>
                </div>
              </div>
              <span className="rounded-full border border-white/30 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-on-dark-muted)]">
                Live
              </span>
            </div>

            {recommendations.length === 0 ? (
              <p className="mt-5 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-[var(--color-text-on-dark-muted)]">
                Everything is on track — no actions waiting. New suggestions appear as campaigns run.
              </p>
            ) : (
              <ul className="mt-5 space-y-2">
                {recommendations.map((r) => (
                  <li key={r.title}>
                    <Link
                      href={r.href}
                      className="group flex items-center gap-3 rounded-2xl border border-white/12 bg-white/5 p-3.5 transition-colors hover:border-white/30 hover:bg-white/10"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary-ink">
                        <r.Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{r.title}</span>
                        <span className="block text-[11px] leading-snug text-[var(--color-text-on-dark-muted)]">{r.detail}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-accent-on-dark">
                        {r.cta}
                        <IconChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/12 bg-white/12">
            {[
              { label: "Contact coverage", value: `${pct(stats.contacts, stats.total)}%` },
              { label: "Avg. audit score", value: stats.audited ? String(stats.avgScore) : "—" },
              { label: "Engagement", value: stats.sent ? `${pct(stats.engaged, stats.sent)}%` : "—" },
            ].map((m) => (
              <div key={m.label} className="flex flex-col-reverse bg-background-dark p-3">
                <dt className="mt-0.5 text-[11px] text-[var(--color-text-on-dark-muted)]">{m.label}</dt>
                <dd className="font-display text-xl font-semibold">{m.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* Campaigns + meetings */}
      <div className="grid gap-5 lg:grid-cols-[1.8fr_1fr] lg:items-start">
        <AdminCard
          title="Campaign Performance"
          subtitle="Discovery progress and results per market"
          icon={IconTarget}
          count={campaigns.length}
          action={<IconButton Icon={IconArrowUpRight} label="All campaigns" href="/admin/campaigns" />}
        >
          {campaigns.length === 0 ? (
            <EmptyState title="No campaigns yet" message="Create a campaign to start discovering practices." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {campaigns.slice(0, 3).map((c, i) => {
                const found = c._count.businesses;
                const audited = c.businesses.filter((b) => AUDITED_OR_LATER.has(b.status)).length;
                const contacted = c.businesses.filter((b) => b.status === "OUTREACH_ACTIVE" || b.status === "CONVERTED").length;
                const won = c.businesses.filter((b) => b.status === "CONVERTED").length;
                const thumb = ["bg-accent-soft text-primary-ink", "bg-secondary-soft text-secondary-ink", "bg-growth-soft text-growth-ink"][i % 3];
                return (
                  <Link
                    key={c.id}
                    href={`/admin/campaigns/${c.id}`}
                    className="group overflow-hidden rounded-[18px] border border-border/80 bg-surface transition-all duration-[var(--duration-normal)] hover:border-border-strong hover:shadow-md"
                  >
                    <div className={`${thumb} relative h-24 p-4`}>
                      <div className="relative flex h-full flex-col justify-between">
                        <span className="flex items-center gap-1 text-[11px] font-semibold">
                          <IconMapPin className="h-3.5 w-3.5" /> {c.city}
                          {c.state ? `, ${c.state}` : ""}
                        </span>
                        <span className="font-display text-lg font-bold leading-tight text-foreground">{c.category}</span>
                      </div>
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-bold text-foreground group-hover:text-primary-ink">{c.name}</p>
                        <StatusBadge status={c.status} />
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between text-[11px] font-semibold text-muted-foreground">
                          <span>Discovered</span>
                          <span>
                            {found}/{c.maxBusinesses}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                          <div className="h-full rounded-full bg-growth" style={{ width: `${Math.min(pct(found, c.maxBusinesses), 100)}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-primary-ink">{audited} audited</span>
                        <span className="rounded-full bg-secondary-soft px-2 py-0.5 text-secondary-ink">{contacted} contacted</span>
                        <span className="rounded-full bg-growth-soft px-2 py-0.5 text-growth-ink">{won} won</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </AdminCard>

        <div className="space-y-5">
          <AdminCard
            title="Meeting Requests"
            icon={IconCalendarCheck}
            count={meetingsRequested.length}
            action={<IconButton Icon={IconArrowUpRight} label="All meetings" href="/admin/meetings" />}
          >
            {meetingsRequested.length === 0 ? (
              <EmptyState title="No pending requests" message="All consultation requests have been scheduled." />
            ) : (
              <ul className="space-y-2">
                {meetingsRequested.slice(0, 4).map((app) => (
                  <li key={app.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted/60 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{app.business?.name || "Practice Request"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {app.type === "ONLINE" ? "Video Consultation" : "In-Person Visit"}
                      </p>
                    </div>
                    <Link
                      href="/admin/meetings"
                      className="inline-flex h-8 items-center rounded-full bg-growth-soft px-3 text-xs font-bold text-growth-ink hover:bg-growth/20"
                    >
                      Schedule
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>

          <AdminCard
            title="System Health"
            icon={IconLink}
            subtitle={
              <StatusLine tone={integrationIssues.length === 0 ? "good" : "warn"}>
                {integrationIssues.length === 0 ? "All connected" : `${integrationIssues.length} need attention`}
              </StatusLine>
            }
            action={<IconButton Icon={IconArrowUpRight} label="Integrations" href="/admin/integrations" />}
          >
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90" aria-hidden>
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-surface-muted)" strokeWidth="4" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    stroke="var(--color-growth)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(pct(integrations.length - integrationIssues.length, integrations.length) / 100) * 97.4} 97.4`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-semibold text-foreground">
                  {integrations.length - integrationIssues.length}/{integrations.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {integrationIssues.length === 0 ? (
                  "All integrations are connected and live."
                ) : (
                  <>
                    <strong className="text-foreground">{integrationIssues.length}</strong> integration
                    {integrationIssues.length === 1 ? " is" : "s are"} on fallback or test mode — results use sample data until connected.
                  </>
                )}
              </p>
            </div>
          </AdminCard>
        </div>
      </div>

      {message && (
        <div role="alert" className="rounded-2xl border border-primary/20 bg-accent-soft p-3 text-xs font-bold text-primary-ink">
          {message}
        </div>
      )}

      {/* Every practice, with real bulk actions */}
      <AdminCard
        title="All Practices"
        subtitle="Select practices to audit or contact in bulk"
        icon={IconStorefront}
        count={businesses.length}
        action={
          <div className="relative w-56">
            <IconSearch className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name or city..."
              className="h-10 w-full rounded-full border border-border bg-surface pl-10 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        }
      >
        {filtered.length === 0 ? (
          <EmptyState title="No practices yet" message="Run a campaign to auto-discover practices." />
        ) : (
          <>
            {selected.size > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-accent-soft p-2.5">
                <span className="px-1 text-xs font-bold text-primary-ink">{selected.size} selected</span>
                <button
                  onClick={() => runBulk("audit")}
                  disabled={bulkLoading}
                  className="inline-flex h-8 items-center rounded-full bg-primary px-4 text-[11px] font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                >
                  Run Audit
                </button>
                <button
                  onClick={() => runBulk("outreach")}
                  disabled={bulkLoading}
                  className="inline-flex h-8 items-center rounded-full bg-growth-soft px-4 text-[11px] font-bold text-growth-ink hover:bg-growth/20 disabled:opacity-50"
                >
                  Send Outreach
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="w-8 rounded-l-xl bg-surface-muted/70 px-3 py-3">
                      <input type="checkbox" checked={selected.size > 0 && selected.size === filtered.length} onChange={toggleAll} />
                    </th>
                    <th className="bg-surface-muted/70 px-3 py-3">Practice</th>
                    <th className="bg-surface-muted/70 px-3 py-3">Contact</th>
                    <th className="bg-surface-muted/70 px-3 py-3 text-center">Audit</th>
                    <th className="bg-surface-muted/70 px-3 py-3 text-center">Outreach</th>
                    <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {filtered.map((b) => (
                    <tr key={b.id} className="transition-colors hover:bg-surface-muted/40">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(b.id)} onChange={() => toggleRow(b.id)} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-primary-ink">
                            {b.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <Link href={`/admin/businesses/${b.id}`} className="font-bold text-foreground hover:text-primary-ink hover:underline">
                              {b.name}
                            </Link>
                            <p className="text-[11px] text-muted-foreground">
                              {b.city}, {b.country}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {b.contact ? (
                          <>
                            <p className="font-semibold text-foreground">{b.contact.name}</p>
                            <p className="text-[11px] text-muted-foreground">{b.contact.email}</p>
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-warning">Not found yet</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {b.audit ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 font-display text-xs font-semibold ${
                              b.audit.score >= 70
                                ? "bg-growth-soft text-growth-ink"
                                : b.audit.score >= 50
                                  ? "bg-accent-soft text-primary-ink"
                                  : "bg-danger/10 text-danger"
                            }`}
                          >
                            {b.audit.score}/100
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Pending</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <StatusBadge status={b.outreachStatus || "PENDING"} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/admin/businesses/${b.id}`}
                          className="inline-flex h-8 items-center gap-0.5 rounded-full bg-surface-muted px-3 text-[11px] font-bold text-foreground hover:bg-border"
                        >
                          View <IconChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </AdminCard>
    </div>
  );
}
