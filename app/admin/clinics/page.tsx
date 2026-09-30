"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { IconArrowUpRight, IconPlus, IconUsers } from "@/components/icons";
import { ClinicProfileFields, EMPTY_PROFILE, type ClinicProfile } from "@/components/clinic/settings/ClinicProfileFields";
import { InviteLinkNotice, type InviteResult } from "@/components/clinic/team/InviteLinkNotice";
import { MemberStatusBadge } from "@/components/clinic/team/MemberStatusBadge";
import { memberStatus } from "@/components/clinic/team/memberStatus";

type ClinicRow = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  active: boolean;
  createdAt: string;
  teamSize: number;
  patientCount: number;
  owner: { name: string; email: string; active: boolean; hasPassword: boolean; inviteExpiresAt: string | null } | null;
};

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<ClinicRow[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [profile, setProfile] = useState<ClinicProfile>(EMPTY_PROFILE);
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string; email: string; invite: InviteResult } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clinics");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setClinics(data.clinics);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load clinics");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, ownerName, ownerEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create the clinic");
      setCreated({ id: data.clinic.id, name: data.clinic.name, email: ownerEmail.trim().toLowerCase(), invite: data.invite });
      setProfile(EMPTY_PROFILE);
      setOwnerName("");
      setOwnerEmail("");
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">Clinics</h1>
          <p className="mt-1 text-body-small text-muted-foreground">
            Dental practices using the dentist panel. Each clinic&apos;s owner is invited by email and then adds their own team.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/clinic/login"
            target="_blank"
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
          >
            Dentist panel login <IconArrowUpRight className="h-4 w-4" />
          </Link>
          {!formOpen && (
            <Button onClick={() => setFormOpen(true)}>
              <span className="inline-flex items-center gap-1.5">
                <IconPlus className="h-4 w-4" /> Add clinic
              </span>
            </Button>
          )}
        </div>
      </div>

      {created && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">
            {created.name} was created.{" "}
            <Link href={`/admin/clinics/${created.id}`} className="text-primary-ink underline">
              Open clinic
            </Link>
          </p>
          <InviteLinkNotice invite={created.invite} email={created.email} onDismiss={() => setCreated(null)} />
        </div>
      )}

      {formOpen && (
        <AdminCard title="Add clinic" icon={IconPlus} subtitle="The owner gets an invite link to set their password.">
          <form onSubmit={submit} className="space-y-6" noValidate>
            {formError && (
              <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-body-small font-semibold text-danger">
                {formError}
              </div>
            )}
            <ClinicProfileFields value={profile} onChange={setProfile} idPrefix="new-clinic" />
            <div className="border-t border-border pt-5">
              <p className="mb-4 text-sm font-semibold text-foreground">Clinic owner</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="owner-name" label="Owner name" required optionalLabel={false}>
                  <Input id="owner-name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Dr. Jane Smith" required />
                </FormField>
                <FormField id="owner-email" label="Owner email" required optionalLabel={false} hint="They'll sign in with this address.">
                  <Input id="owner-email" type="email" inputMode="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} required />
                </FormField>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" loading={saving} disabled={saving}>
                Create clinic and send invite
              </Button>
            </div>
          </form>
        </AdminCard>
      )}

      <AdminCard title="All clinics" icon={IconUsers} count={clinics?.length} flush>
        {loadError ? (
          <p className="p-5 text-sm font-semibold text-danger">{loadError}</p>
        ) : !clinics ? (
          <p className="p-5 text-sm text-muted-foreground">Loading…</p>
        ) : clinics.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No clinics yet" message="Add the first clinic to give a dentist access to their panel." compact={false} />
          </div>
        ) : (
          <div className="overflow-x-auto p-3">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">Clinic</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Owner</th>
                  <th className="bg-surface-muted/70 px-3 py-3 text-center">Team</th>
                  <th className="bg-surface-muted/70 px-3 py-3 text-center">Patients</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Status</th>
                  <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {clinics.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-muted/40">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-primary-ink">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/clinics/${c.id}`} className="font-bold text-foreground hover:text-primary-ink hover:underline">
                            {c.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">{[c.city, c.province].filter(Boolean).join(", ") || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {c.owner ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">{c.owner.email}</p>
                          <MemberStatusBadge status={memberStatus(c.owner)} />
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-warning">No owner</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-foreground">{c.teamSize}</td>
                    <td className="px-3 py-3 text-center font-semibold text-foreground">{c.patientCount}</td>
                    <td className="px-3 py-3">
                      {c.active ? <StatusBadge status="ACTIVE" /> : <MemberStatusBadge status="DEACTIVATED" />}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("en-CA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
