"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { IconInfo, IconPlus, IconUsers } from "@/components/icons";
import { InviteLinkNotice, type InviteResult } from "@/components/clinic/team/InviteLinkNotice";
import { MemberStatusBadge } from "@/components/clinic/team/MemberStatusBadge";
import { memberStatus } from "@/components/clinic/team/memberStatus";
import type { ClinicRole } from "@/components/clinic/ClinicSessionContext";

type Member = {
  id: string;
  name: string;
  email: string;
  role: ClinicRole;
  active: boolean;
  hasPassword: boolean;
  inviteExpiresAt: string | null;
  lastLoginAt: string | null;
  isYou: boolean;
};

const ROLES: { value: ClinicRole; label: string; description: string }[] = [
  { value: "OWNER", label: "Owner", description: "Everything, including team and clinic settings." },
  { value: "MANAGER", label: "Manager", description: "Everything except team and clinic settings." },
  { value: "STAFF", label: "Staff", description: "Patients, inventory and social media. No accounting." },
];

export default function ClinicTeamPage() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ClinicRole>("STAFF");
  const [saving, setSaving] = useState(false);
  const [invite, setInvite] = useState<{ email: string; result: InviteResult } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/clinic/team");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMembers(data.members);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load your team");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const call = async (memberId: string, url: string, method: string, body?: object) => {
    setError("");
    setBusy(memberId);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      await load();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/clinic/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send the invite");
      setInvite({ email: email.trim().toLowerCase(), result: data.invite });
      setName("");
      setEmail("");
      setRole("STAFF");
      setFormOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const resend = async (m: Member) => {
    const data = await call(m.id, `/api/clinic/team/${m.id}/invite`, "POST");
    if (data?.invite) setInvite({ email: m.email, result: data.invite });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">Team</h1>
          <p className="mt-1 text-body-small text-muted-foreground">Invite your staff and choose what each person can see.</p>
        </div>
        {!formOpen && (
          <Button onClick={() => setFormOpen(true)} className="shrink-0">
            <span className="inline-flex items-center gap-1.5">
              <IconPlus className="h-4 w-4" /> Invite member
            </span>
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-body-small font-semibold text-danger">
          {error}
        </div>
      )}
      {invite && <InviteLinkNotice invite={invite.result} email={invite.email} onDismiss={() => setInvite(null)} />}

      {formOpen && (
        <AdminCard title="Invite a team member" icon={IconPlus} subtitle="They'll get a link to set their own password.">
          <form onSubmit={submitInvite} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="member-name" label="Name" required optionalLabel={false}>
                <Input id="member-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} required />
              </FormField>
              <FormField id="member-email" label="Email" required optionalLabel={false}>
                <Input id="member-email" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </FormField>
              <div className="sm:col-span-2">
                <FormField id="member-role" label="Role" required optionalLabel={false} hint={ROLES.find((r) => r.value === role)?.description}>
                  <Select id="member-role" value={role} onChange={(e) => setRole(e.target.value as ClinicRole)}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={saving}>
                Send invite
              </Button>
            </div>
          </form>
        </AdminCard>
      )}

      <AdminCard title="Members" icon={IconUsers} count={members?.length} flush>
        {loadError ? (
          <p className="p-5 text-sm font-semibold text-danger">{loadError}</p>
        ) : !members ? (
          <p className="p-5 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto p-3">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">Member</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Role</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Status</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Last sign-in</th>
                  <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {members.map((m) => (
                  <tr key={m.id} className="transition-colors hover:bg-surface-muted/40">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-primary-ink">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground">
                            {m.name}
                            {m.isYou && <span className="ml-1.5 font-semibold text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {m.isYou ? (
                        <span className="font-semibold text-foreground">Owner</span>
                      ) : (
                        <Select
                          aria-label={`Role for ${m.name}`}
                          value={m.role}
                          disabled={busy === m.id}
                          onChange={(e) => call(m.id, `/api/clinic/team/${m.id}`, "PATCH", { role: e.target.value })}
                          className="!h-9 min-w-[120px] !text-xs"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </Select>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <MemberStatusBadge status={memberStatus(m)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                      {m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }) : "Never"}
                    </td>
                    <td className="px-3 py-3">
                      {!m.isYou && (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {confirm === m.id ? (
                            <>
                              <span className="font-semibold text-foreground">{m.active ? "Remove their access?" : "Restore access?"}</span>
                              <Button
                                size="sm"
                                variant={m.active ? "danger" : "primary"}
                                loading={busy === m.id}
                                onClick={async () => {
                                  if (await call(m.id, `/api/clinic/team/${m.id}`, "PATCH", { active: !m.active })) setConfirm(null);
                                }}
                              >
                                Yes
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setConfirm(null)}>
                                No
                              </Button>
                            </>
                          ) : (
                            <>
                              {!m.hasPassword && m.active && (
                                <Button size="sm" variant="outline" loading={busy === m.id} onClick={() => resend(m)}>
                                  Resend invite
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setConfirm(m.id)}>
                                {m.active ? "Deactivate" : "Reactivate"}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <AdminCard title="What each role can do" icon={IconInfo}>
        <ul className="grid gap-3 sm:grid-cols-3">
          {ROLES.map((r) => (
            <li key={r.value} className="rounded-xl border border-border p-4">
              <p className="text-sm font-semibold text-foreground">{r.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
