"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import {
  IconMenuDots,
  IconStorefront,
  IconArrowUpRight,
  IconInfo,
  IconLink,
  IconPhoneWave,
  IconMapPin,
  IconStar,
  IconFileText,
  IconGauge,
  IconTarget,
  IconClock,
  IconTrendingUp,
  IconCheck,
  IconSparkle,
  IconClipboardCheck,
  IconCheckCircle,
  IconMonitor,
  IconUsers,
  IconUser,
  IconPlus,
  IconMail,
  IconCalendarCheck,
} from "@/components/icons";
import { AdminCard } from "@/components/admin/AdminCard";
import { IconButton } from "@/components/admin/IconButton";
import { InfoRow, Chip, StatusLine } from "@/components/admin/InfoRow";
import { LeadEmails } from "@/components/admin/LeadEmails";

type AuditResultRow = { category: string; score: number; findingsJson: Record<string, unknown>; detailsJson: unknown };
type Audit = {
  id: string;
  publicToken: string;
  status: string;
  score: number;
  pdfStatus: string;
  pdfUrl: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  results: AuditResultRow[];
  competitorGaps: { name: string; rank: number; mapScore: number | null }[];
};
type Contact = { id: string; firstName: string; lastName: string; email: string; phone: string | null; role: string | null; source: string };
type Appointment = { id: string; type: string; status: string; scheduledTime: string; address: string | null; preferredWindow: string | null };
type SalesActivity = { id: string; type: string; content: string; createdAt: string; user: { name: string } };

type BusinessDetail = {
  id: string;
  name: string;
  website: string;
  address: string | null;
  city: string;
  state: string | null;
  country: string;
  phone: string | null;
  category: string;
  status: string;
  opportunityScore: number;
  dealValueCents: number | null;
  wonAt: string | null;
  firstTouchSource: string | null;
  firstTouchMedium: string | null;
  firstTouchCampaign: string | null;
  providerSource: string | null;
  rating: number | null;
  reviewCount: number | null;
  googlePlaceId: string | null;
  lastCheckedAt: string | null;
  createdAt: string;
  campaign: { id: string; name: string } | null;
  contacts: Contact[];
  appointments: Appointment[];
  salesActivities: SalesActivity[];
  audits: Audit[];
};

type Narrative = {
  headline: { line1: string; line2: string };
  dek: string;
  stats: Array<{ value: string; label: string; caption: string }>;
  fixCards: Array<{ title: string; detail: string; impact: string }>;
  quietLeaks: Array<{ title: string; detail: string }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  LOCAL_VISIBILITY: "Local Visibility",
  WEBSITE_QUALITY: "Website Quality",
  CONVERSION: "Conversion",
  REPUTATION: "Reviews & Reputation",
  COMPETITOR_GAP: "Competitor Gap",
};

const CONTACT_SOURCE_LABELS: Record<string, { label: string; classes: string }> = {
  APOLLO: { label: "Apollo Verified", classes: "bg-growth/10 text-growth-ink" },
  WEBSITE: { label: "Found on Website", classes: "bg-secondary/10 text-secondary-ink" },
  SELF_SERVE: { label: "Self-Submitted", classes: "bg-secondary/10 text-secondary-ink" },
  MANUAL: { label: "Manually Added", classes: "bg-warning/10 text-warning" },
};

export default function AdminBusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  
  // Contact Modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Principal Dentist");

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActionMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/businesses/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load business");
      setBusiness(json.business);
      setNarrative(json.narrative || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load business");
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchDetail();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDetail]);

  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update practice status");
      setActionMessage(`Practice status updated to ${newStatus}`);
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkWon = async () => {
    const dealValueInput = window.prompt("Deal value in dollars (leave blank to skip):");
    if (dealValueInput === null) return; // user cancelled

    const dollars = dealValueInput.trim() ? Number(dealValueInput.trim()) : undefined;
    if (dollars !== undefined && (Number.isNaN(dollars) || dollars < 0)) {
      setActionMessage("Deal value must be a positive number");
      return;
    }

    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/admin/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONVERTED",
          markWon: true,
          ...(dollars !== undefined ? { dealValueCents: Math.round(dollars * 100) } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark this lead won");
      setActionMessage("Marked as won");
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setActionLoading(true);
    setActionMessage("");
    try {
      const res = await fetch(`/api/admin/audits/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to trigger audit");
      setActionMessage("Audit execution enqueued successfully!");
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Audit trigger failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: id, firstName, lastName, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add contact");
      setActionMessage("Contact added — outreach will queue automatically if an audit is already complete.");
      setShowContactModal(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      await fetchDetail();
    } catch (err: unknown) {
      setActionMessage(err instanceof Error ? err.message : "Contact add failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/20 bg-danger/10 p-6 text-center text-body-small font-semibold text-danger">
        {error}
      </div>
    );
  }

  if (!business) {
    return <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary" />;
  }

  const latestAudit = business.audits[0];

  // Read-only automation pipeline status — every node reflects real pipeline
  // state already on the record, nothing here triggers anything manually.
  const contact = business.contacts[0];
  const outreachSent = business.salesActivities.some((a) => a.type === "EMAIL") || business.status === "OUTREACH_ACTIVE" || business.status === "CONVERTED";
  const engaged = business.appointments.length > 0 || business.status === "CONVERTED";

  const pipelineNodes: { label: string; state: "done" | "pending" | "blocked"; detail: string }[] = [
    { label: "Discovered", state: "done", detail: business.providerSource === "GOOGLE_PLACES" ? "Google Places" : business.providerSource === "DATAFORSEO" ? "DataForSEO" : business.providerSource === "SELF_SERVE" ? "Self-submitted" : business.providerSource === "TEST_PROVIDER" ? "Test fixture" : "Direct" },
    {
      label: "Contact Found",
      state: contact ? "done" : "blocked",
      detail: contact ? (CONTACT_SOURCE_LABELS[contact.source]?.label || contact.source) : "Apollo & website both came up empty",
    },
    {
      label: "Audited",
      state: latestAudit?.status === "COMPLETED" ? "done" : latestAudit ? "pending" : "pending",
      detail: latestAudit?.status === "COMPLETED" ? `Score ${latestAudit.score}/100 (AI + DataForSEO)` : latestAudit ? "Running..." : "Queued on discovery",
    },
    {
      label: "PDF Ready",
      state: latestAudit?.pdfStatus === "READY" ? "done" : "pending",
      detail: latestAudit?.pdfStatus === "READY" ? "Report generated" : latestAudit?.pdfStatus.replace(/_/g, " ") || "Not started",
    },
    {
      label: "Outreach Sent",
      state: outreachSent ? "done" : contact && latestAudit?.status === "COMPLETED" ? "pending" : "blocked",
      detail: outreachSent ? "Sent automatically — no approval needed" : !contact ? "Waiting on a contact" : latestAudit?.status !== "COMPLETED" ? "Waiting on audit" : "Queuing...",
    },
    {
      label: "Replied / Meeting",
      state: engaged ? "done" : "pending",
      detail: engaged ? `${business.appointments.length} scheduled` : "No reply yet",
    },
  ];

  const statusTone =
    business.status === "CONVERTED" ? "good" : business.status === "DISQUALIFIED" ? "bad" : business.status === "DISCOVERED" ? "neutral" : "warn";
  const sourceLabel =
    business.providerSource === "GOOGLE_PLACES"
      ? "Google Places"
      : business.providerSource === "DATAFORSEO"
        ? "DataForSEO"
        : business.providerSource === "APOLLO"
          ? "Apollo"
          : business.providerSource === "TEST_PROVIDER"
            ? "Test Fixture"
            : "Direct Website Check";
  const location = [business.city, business.state, business.country].filter(Boolean).join(", ");
  const menuItemClass = "flex w-full min-h-[40px] items-center rounded-xl px-3 text-left text-xs font-semibold transition-colors";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin/businesses" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
          &larr; All leads
        </Link>
      </div>

      {actionMessage && (
        <div role="alert" className="rounded-2xl border border-primary/20 bg-accent-soft p-4 text-sm font-semibold text-primary-ink">
          {actionMessage}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[340px_1fr] lg:items-start">
        {/* Profile */}
        <AdminCard
          title="Profile"
          icon={IconStorefront}
          action={
            <>
              <IconButton Icon={IconArrowUpRight} label="Open website" href={business.website} />
              <div className="relative" ref={actionMenuRef}>
                <IconButton
                  Icon={IconMenuDots}
                  label="More actions"
                  onClick={() => setActionMenuOpen((v) => !v)}
                  aria-expanded={actionMenuOpen}
                  aria-haspopup="true"
                />
                {actionMenuOpen && (
                  <div className="animate-fade-in-down absolute right-0 top-12 z-30 w-48 space-y-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        void handleUpdateStatus("QUALIFIED");
                      }}
                      className={`${menuItemClass} text-foreground hover:bg-surface-muted`}
                    >
                      Mark Qualified
                    </button>
                    <button
                      onClick={() => {
                        setActionMenuOpen(false);
                        void handleRunAudit();
                      }}
                      className={`${menuItemClass} text-foreground hover:bg-surface-muted`}
                    >
                      Run / Rerun Audit
                    </button>
                    {business.status !== "CONVERTED" && (
                      <button
                        onClick={() => {
                          setActionMenuOpen(false);
                          void handleMarkWon();
                        }}
                        className={`${menuItemClass} text-growth-ink hover:bg-growth-soft`}
                      >
                        Mark Won
                      </button>
                    )}
                    {business.status !== "DISQUALIFIED" && (
                      <button
                        onClick={() => {
                          setActionMenuOpen(false);
                          void handleUpdateStatus("DISQUALIFIED");
                        }}
                        className={`${menuItemClass} text-danger hover:bg-danger/10`}
                      >
                        Mark Disqualified
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          }
        >
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-display text-xl font-bold leading-tight tracking-[-0.01em] text-foreground">{business.name}</h1>
            <span className="mt-1 shrink-0 text-xs">
              <StatusLine tone={statusTone}>{business.status.replace(/_/g, " ").toLowerCase()}</StatusLine>
            </span>
          </div>

          <div className="mt-4 flex aspect-[4/3] flex-col items-center justify-center rounded-2xl bg-accent-soft text-primary-ink">
            <span className="font-display text-6xl font-bold">{business.name.charAt(0).toUpperCase()}</span>
            <span className="mt-2 text-xs font-semibold">{business.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label="City">{business.city}</Chip>
            <Chip label="Category">{business.category}</Chip>
            <Chip label="Score">{business.opportunityScore}/100</Chip>
            {business.rating != null && (
              <Chip label="Rating">
                {business.rating.toFixed(1)} ★{business.reviewCount != null ? ` (${business.reviewCount})` : ""}
              </Chip>
            )}
            {business.wonAt && (
              <Chip className="bg-growth-soft text-growth-ink">
                Won{business.dealValueCents ? ` · $${(business.dealValueCents / 100).toLocaleString()}` : ""}
              </Chip>
            )}
          </div>

          {business.campaign && (
            <>
              <p className="mt-4 text-xs font-semibold text-foreground">Campaign</p>
              <div className="mt-2">
                <Link href={`/admin/campaigns/${business.campaign.id}`}>
                  <Chip className="hover:bg-border">{business.campaign.name}</Chip>
                </Link>
              </div>
            </>
          )}
        </AdminCard>

        {/* Main information */}
        <AdminCard
          title="Main Information"
          icon={IconInfo}
          subtitle={<StatusLine tone={statusTone}>Status in the pipeline: {business.status.replace(/_/g, " ").toLowerCase()}</StatusLine>}
          action={<IconButton Icon={IconArrowUpRight} label="Open website" href={business.website} />}
          flush
        >
          <div className="grid divide-y divide-border px-5 sm:grid-cols-2 sm:divide-y-0 sm:gap-x-8 [&>*]:border-border sm:[&>*:nth-child(n+3)]:border-t">
            <InfoRow Icon={IconLink} label="Website">
              <a href={business.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary-ink hover:underline">
                {business.website.replace(/^https?:\/\//, "")}
              </a>
            </InfoRow>
            <InfoRow Icon={IconPhoneWave} label="Phone">
              {business.phone || "—"}
            </InfoRow>
            <InfoRow Icon={IconMapPin} label="Address">
              {business.address || location}
            </InfoRow>
            <InfoRow
              Icon={IconStar}
              label="Google reviews"
              aside={
                business.googlePlaceId && (
                  <a
                    href={`https://www.google.com/maps/place/?q=place_id:${business.googlePlaceId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary-ink underline-offset-2 hover:underline"
                  >
                    Maps
                  </a>
                )
              }
            >
              {business.rating != null ? `${business.rating.toFixed(1)} ★` : "—"}
              {business.reviewCount != null && <span>· {business.reviewCount} reviews</span>}
            </InfoRow>
            <InfoRow Icon={IconFileText} label="Data source">
              {sourceLabel}
            </InfoRow>
            <InfoRow Icon={IconGauge} label="Opportunity score">
              <span className="font-semibold text-primary-ink">{business.opportunityScore}/100</span>
            </InfoRow>
            <InfoRow Icon={IconTarget} label="Acquired via">
              {business.firstTouchSource || "direct"}
              {business.firstTouchMedium ? ` / ${business.firstTouchMedium}` : ""}
              {business.firstTouchCampaign ? ` · “${business.firstTouchCampaign}”` : ""}
            </InfoRow>
            <InfoRow Icon={IconClock} label="Discovered on">
              {new Date(business.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
              {business.lastCheckedAt && <span>· checked {new Date(business.lastCheckedAt).toLocaleDateString("en-CA")}</span>}
            </InfoRow>
          </div>
        </AdminCard>
      </div>

      {/* Automation pipeline — read only, reflects real state, nothing here is manually triggered */}
      <AdminCard
        title="Automation Pipeline"
        icon={IconTrendingUp}
        subtitle="Enrichment, audit, PDF and outreach run automatically once a practice is discovered."
      >
        <ol className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {pipelineNodes.map((node, i) => (
            <li key={node.label} className="flex items-start gap-3 rounded-2xl bg-surface-muted/70 p-3.5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                  node.state === "done"
                    ? "border-growth/40 bg-growth-soft text-growth-ink"
                    : node.state === "blocked"
                      ? "border-danger/30 bg-danger/10 text-danger"
                      : "border-warning/30 bg-warning/10 text-warning"
                }`}
              >
                {node.state === "done" ? <IconCheck className="h-4 w-4" /> : node.state === "blocked" ? "!" : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{node.label}</span>
                <span className="block text-[11px] leading-snug text-muted-foreground">{node.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </AdminCard>

      {/* Personalized pitch — non-technical, ready to say on a call. Built from
          the same real findings as the audit, just translated out of raw scores. */}
      {narrative && (
        <AdminCard title="Personalized Strategy" icon={IconSparkle} subtitle="Talking points for this practice, from its audit">
          <h2 className="font-display text-xl font-bold leading-snug tracking-[-0.01em] text-foreground">
            {narrative.headline.line1} <span className="text-secondary-ink">{narrative.headline.line2}</span>
          </h2>
          <p className="mt-2 max-w-3xl font-copy text-sm leading-relaxed text-muted-foreground">{narrative.dek}</p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {narrative.stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-surface-muted/70 p-4">
                <span className="block font-display text-2xl font-bold text-foreground">{s.value}</span>
                <span className="mt-1 block text-xs font-semibold text-foreground">{s.label}</span>
                <span className="block text-[11px] text-muted-foreground">{s.caption}</span>
              </div>
            ))}
          </div>

          {narrative.fixCards.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-foreground">What to lead with</p>
              <ul className="mt-1 divide-y divide-border">
                {narrative.fixCards.map((f, i) => (
                  <li key={f.title} className="flex items-start gap-4 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border font-display text-sm font-bold text-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-foreground">{f.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{f.detail}</span>
                    </span>
                    <span className="hidden shrink-0 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold text-primary-ink sm:block">
                      {f.impact}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {narrative.quietLeaks.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-foreground">Also worth mentioning</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {narrative.quietLeaks.map((q) => (
                  <span key={q.title} title={q.detail} className="rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground">
                    {q.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </AdminCard>
      )}

      {/* Audit status & scores */}
      <AdminCard
        title="Audit & PDF Report"
        icon={IconClipboardCheck}
        subtitle={
          latestAudit ? (
            <StatusLine tone={latestAudit.status === "COMPLETED" ? "good" : "warn"}>
              Audit {latestAudit.status.toLowerCase()} · PDF {latestAudit.pdfStatus.replace(/_/g, " ").toLowerCase()}
            </StatusLine>
          ) : (
            "No audit yet"
          )
        }
        action={
          latestAudit && (
            <>
              <IconButton Icon={IconArrowUpRight} label="View web report" href={`/audit/${latestAudit.publicToken}`} />
              <a
                href={`/api/audit/${latestAudit.publicToken}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center rounded-full bg-background-dark px-4 text-xs font-semibold text-white transition-colors hover:bg-primary"
              >
                Download PDF
              </a>
            </>
          )
        }
      >
        {!latestAudit ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No audit has been run for this practice yet. Use &quot;Run / Rerun Audit&quot; in the profile menu.
          </p>
        ) : (
          <>
            <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
              <InfoRow Icon={IconGauge} label="Overall score">
                <span className="font-display text-base font-bold text-primary-ink">{latestAudit.score}</span>/100
              </InfoRow>
              <InfoRow Icon={IconCheckCircle} label="Audit status">
                {latestAudit.status.toLowerCase()}
              </InfoRow>
              <InfoRow Icon={IconFileText} label="PDF status">
                {latestAudit.pdfStatus.replace(/_/g, " ").toLowerCase()}
              </InfoRow>
              <InfoRow Icon={IconMonitor} label="Report views">
                {latestAudit.viewCount}
                {latestAudit.lastViewedAt && <span>· last {new Date(latestAudit.lastViewedAt).toLocaleDateString("en-CA")}</span>}
              </InfoRow>
            </div>

            {(() => {
              const localResult = latestAudit.results.find((r) => r.category === "LOCAL_VISIBILITY");
              const verified = Boolean(localResult?.findingsJson?.verified);
              const ownRank = localResult?.findingsJson?.ownRank as number | null | undefined;
              if (!localResult) return null;
              return (
                <div className="grid gap-x-8 border-t border-border sm:grid-cols-2">
                  <InfoRow Icon={IconMapPin} label="Google Local Pack position">
                    {verified
                      ? ownRank != null
                        ? `Ranked #${ownRank} in ${business.city}`
                        : `Checked — not in the top local results for ${business.city}`
                      : "Not verified against a live lookup — score is an estimate"}
                  </InfoRow>
                  {latestAudit.competitorGaps.length > 0 && (
                    <InfoRow Icon={IconUsers} label="Competitors outranking them">
                      {latestAudit.competitorGaps.map((c) => (
                        <Chip key={c.name}>
                          #{c.rank} {c.name}
                          {c.mapScore != null ? ` · ${c.mapScore}★` : ""}
                        </Chip>
                      ))}
                    </InfoRow>
                  )}
                </div>
              );
            })()}

            <details className="mt-3 border-t border-border pt-4">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
                Show raw audit data (category scores, verified facts, API sources)
              </summary>

              <div className="mt-4 flex flex-wrap gap-2">
                {latestAudit.results.map((r) => (
                  <Chip key={r.category} label={CATEGORY_LABELS[r.category] || r.category}>
                    {r.score}
                  </Chip>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {latestAudit.results.map((r) => (
                  <div key={r.category} className="rounded-2xl bg-surface-muted/70 p-3">
                    <span className="block text-xs font-semibold text-foreground">{CATEGORY_LABELS[r.category] || r.category}</span>
                    <code className="mt-1 block break-all text-[10px] text-muted-foreground">{JSON.stringify(r.findingsJson)}</code>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}
      </AdminCard>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* Contacts */}
        <AdminCard
          title="Decision Makers"
          icon={IconUser}
          count={business.contacts.length}
          action={<IconButton Icon={IconPlus} label="Add contact" onClick={() => setShowContactModal(true)} />}
        >
          {business.contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decision maker contact captured yet.</p>
          ) : (
            <div className="-my-3.5 divide-y divide-border">
              {business.contacts.map((c) => {
                const sourceInfo = CONTACT_SOURCE_LABELS[c.source] || CONTACT_SOURCE_LABELS.MANUAL;
                return (
                  <InfoRow
                    key={c.id}
                    Icon={IconUser}
                    label={`${c.firstName} ${c.lastName}`}
                    aside={<span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${sourceInfo.classes}`}>{sourceInfo.label}</span>}
                  >
                    <span>{c.role || "Principal Dentist"}</span>
                    <span className="inline-flex items-center gap-1">
                      <IconMail className="h-3.5 w-3.5" />
                      {c.email}
                    </span>
                    {c.phone && <span>· {c.phone}</span>}
                  </InfoRow>
                );
              })}
            </div>
          )}
        </AdminCard>

        {/* Meetings */}
        <AdminCard
          title="Consultations & Visits"
          icon={IconCalendarCheck}
          count={business.appointments.length}
          action={<IconButton Icon={IconArrowUpRight} label="Manage meetings" href="/admin/meetings" />}
        >
          {business.appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meetings requested yet.</p>
          ) : (
            <div className="-my-3.5 divide-y divide-border">
              {business.appointments.map((a) => (
                <InfoRow
                  key={a.id}
                  Icon={a.type === "ONLINE" ? IconMonitor : IconMapPin}
                  label={a.type === "ONLINE" ? "Video consultation" : "In-person visit"}
                  aside={<Chip>{a.status.toLowerCase()}</Chip>}
                >
                  {a.type === "ONLINE" ? new Date(a.scheduledTime).toLocaleString("en-CA") : a.address || a.preferredWindow || "Pending details"}
                </InfoRow>
              ))}
            </div>
          )}
        </AdminCard>
      </div>

      <LeadEmails businessId={business.id} contacts={business.contacts} onSent={fetchDetail} />

      {/* Manual Contact Add Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="admin-card w-full max-w-md p-6 shadow-xl">
            <h3 className="font-display text-xl font-bold text-foreground">Add Decision Maker Contact</h3>
            <form onSubmit={handleAddContact} className="mt-4 space-y-4">
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-full border border-border bg-input px-4 text-body-small text-foreground"
                />
              </div>
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-full border border-border bg-input px-4 text-body-small text-foreground"
                />
              </div>
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-10 w-full rounded-full border border-border bg-input px-4 text-body-small text-foreground"
                />
              </div>
              <div>
                <label className="block text-metadata font-semibold text-muted-foreground">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 h-10 w-full rounded-full border border-border bg-input px-4 text-body-small text-foreground"
                >
                  <option value="Principal Dentist">Principal Dentist</option>
                  <option value="Practice Owner">Practice Owner</option>
                  <option value="Practice Manager">Practice Manager</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setShowContactModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" loading={actionLoading}>
                  Save Contact
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
