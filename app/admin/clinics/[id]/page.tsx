"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import { IconPencil, IconUsers, IconSettings } from "@/components/icons";
import { ClinicProfileFields, profileFrom, type ClinicProfile } from "@/components/clinic/settings/ClinicProfileFields";
import { provinceName } from "@/components/clinic/settings/canada";
import { InviteLinkNotice, type InviteResult } from "@/components/clinic/team/InviteLinkNotice";
import { MemberStatusBadge } from "@/components/clinic/team/MemberStatusBadge";
import { memberStatus } from "@/components/clinic/team/memberStatus";

type Clinic = ClinicProfile & { id: string; active: boolean; createdAt: string; currency: string; taxLabel: string; taxRateBps: number };
type ClinicUserRow = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "MANAGER" | "STAFF";
  active: boolean;
  hasPassword: boolean;
  inviteExpiresAt: string | null;
  lastLoginAt: string | null;
};
type Counts = { patients: number; inventoryItems: number; invoices: number; socialPosts: number };

const ROLE_LABEL = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" } as const;

export default function AdminClinicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [users, setUsers] = useState<ClinicUserRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [confirmUser, setConfirmUser] = useState<string | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; result: InviteResult } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/clinics/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClinic(data.clinic);
      setUsers(data.users);
      setCounts(data.counts);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load clinic");
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const patchClinic = async (body: Record<string, unknown>) => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clinics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save");
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profile && (await patchClinic(profile))) setEditing(false);
  };

  const toggleClinic = async () => {
    if (clinic && (await patchClinic({ active: !clinic.active }))) setConfirmToggle(false);
  };

  const resendInvite = async (u: ClinicUserRow) => {
    setError("");
    setBusyUser(u.id);
    try {
      const res = await fetch(`/api/admin/clinics/${id}/users/${u.id}/invite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't resend the invite");
      setInvite({ email: u.email, result: data.invite });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyUser(null);
    }
  };

  const toggleUser = async (u: ClinicUserRow) => {
    setError("");
    setBusyUser(u.id);
    try {
      const res = await fetch(`/api/admin/clinics/${id}/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !u.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update the user");
      setConfirmUser(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyUser(null);
    }
  };

  if (loadError) return <div className="admin-card p-8 text-center text-sm font-semibold text-danger">{loadError}</div>;
  if (!clinic) return <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  const location = [clinic.city, provinceName(clinic.province)].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link href="/admin/clinics" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
            ← All clinics
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">{clinic.name}</h1>
            {clinic.active ? <StatusBadge status="ACTIVE" /> : <MemberStatusBadge status="DEACTIVATED" />}
          </div>
          <p className="mt-1 text-body-small text-muted-foreground">
            {location || "No location set"} · Created {new Date(clinic.createdAt).toLocaleDateString("en-CA")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {confirmToggle ? (
            <>
              <span className="text-sm font-semibold text-foreground">
                {clinic.active ? "Block every user at this clinic from signing in?" : "Let this clinic sign in again?"}
              </span>
              <Button size="sm" variant={clinic.active ? "danger" : "primary"} onClick={toggleClinic} loading={saving}>
                {clinic.active ? "Deactivate" : "Reactivate"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmToggle(false)} disabled={saving}>
                Cancel
              </Button>
            </>
          ) : (
            <Button size="sm" variant={clinic.active ? "outline" : "primary"} onClick={() => setConfirmToggle(true)}>
              {clinic.active ? "Deactivate clinic" : "Reactivate clinic"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-body-small font-semibold text-danger">
          {error}
        </div>
      )}
      {invite && <InviteLinkNotice invite={invite.result} email={invite.email} onDismiss={() => setInvite(null)} />}

      {counts && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Patients", value: counts.patients },
            { label: "Inventory items", value: counts.inventoryItems },
            { label: "Invoices", value: counts.invoices },
            { label: "Social posts", value: counts.socialPosts },
          ].map((s) => (
            <div key={s.label} className="admin-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <AdminCard
        title="Clinic details"
        icon={IconSettings}
        action={
          !editing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setProfile(profileFrom(clinic));
                setEditing(true);
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <IconPencil className="h-4 w-4" /> Edit
              </span>
            </Button>
          )
        }
      >
        {editing && profile ? (
          <form onSubmit={saveProfile} className="space-y-5" noValidate>
            <ClinicProfileFields value={profile} onChange={setProfile} idPrefix="edit-clinic" />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={saving}>
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            {[
              ["Email", clinic.email],
              ["Phone", clinic.phone],
              ["Address", [clinic.address, location].filter(Boolean).join(", ")],
              ["Website", clinic.website],
              ["Sales tax", `${clinic.taxLabel} ${(clinic.taxRateBps / 100).toString()}%`],
              ["Currency", clinic.currency],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words font-semibold text-foreground">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </AdminCard>

      <AdminCard title="Users" icon={IconUsers} count={users.length} subtitle="The clinic owner manages roles from their Team page." flush>
        <div className="overflow-x-auto p-3">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">Name</th>
                <th className="bg-surface-muted/70 px-3 py-3">Role</th>
                <th className="bg-surface-muted/70 px-3 py-3">Status</th>
                <th className="bg-surface-muted/70 px-3 py-3">Last sign-in</th>
                <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs">
              {users.map((u) => {
                const status = memberStatus(u);
                return (
                  <tr key={u.id} className="transition-colors hover:bg-surface-muted/40">
                    <td className="px-3 py-3">
                      <p className="font-bold text-foreground">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    </td>
                    <td className="px-3 py-3 font-semibold text-foreground">{ROLE_LABEL[u.role]}</td>
                    <td className="px-3 py-3">
                      <MemberStatusBadge status={status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {confirmUser === u.id ? (
                          <>
                            <span className="font-semibold text-foreground">{u.active ? "Deactivate?" : "Reactivate?"}</span>
                            <Button size="sm" variant={u.active ? "danger" : "primary"} onClick={() => toggleUser(u)} loading={busyUser === u.id}>
                              Yes
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setConfirmUser(null)}>
                              No
                            </Button>
                          </>
                        ) : (
                          <>
                            {!u.hasPassword && u.active && (
                              <Button size="sm" variant="outline" onClick={() => resendInvite(u)} loading={busyUser === u.id}>
                                Resend invite
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => setConfirmUser(u.id)}>
                              {u.active ? "Deactivate" : "Reactivate"}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
