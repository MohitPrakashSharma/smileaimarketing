"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InfoRow } from "@/components/admin/InfoRow";
import Button from "@/components/ui/Button";
import { IconUser, IconReceipt, IconPencil, IconMail, IconPhoneWave, IconMapPin, IconClock, IconCalendarCheck, IconPlus } from "@/components/icons";
import { PatientForm } from "@/components/clinic/patients/PatientForm";
import { formatDate } from "@/components/clinic/patients/Drawer";
import { formatMoney } from "@/lib/money";
import type { Patient, PatientInvoice } from "@/components/clinic/patients/types";

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [patient, setPatient] = useState<(Patient & { invoices: PatientInvoice[] }) | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinic/patients/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load this patient");
      setPatient(data.patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this patient");
    }
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/clinic/patients/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't delete this patient");
      router.push("/clinic/patients");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete this patient");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (error && !patient) {
    return (
      <div className="admin-card p-8 text-center">
        <p className="font-semibold text-foreground">{error}</p>
        <Link href="/clinic/patients" className="mt-2 inline-block text-sm font-semibold text-primary-ink hover:underline">
          Back to patients
        </Link>
      </div>
    );
  }
  if (!patient) return <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  const fullName = `${patient.firstName} ${patient.lastName}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-primary-ink">
            {patient.firstName.charAt(0).toUpperCase()}
            {patient.lastName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-heading-3 font-bold text-foreground">{fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={patient.status} />
              {patient.tags.map((t) => (
                <span key={t} className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <Link href="/clinic/patients" className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          ← All patients
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-3 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <AdminCard
          title="Details"
          icon={IconUser}
          action={
            <button
              onClick={() => setEditOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
            >
              <IconPencil className="h-4 w-4" /> Edit
            </button>
          }
        >
          <div className="-my-3.5 divide-y divide-border/60">
            <InfoRow Icon={IconMail} label="Email">
              {patient.email || "—"}
            </InfoRow>
            <InfoRow Icon={IconPhoneWave} label="Phone">
              {patient.phone || "—"}
            </InfoRow>
            <InfoRow Icon={IconUser} label="Date of birth">
              {formatDate(patient.dateOfBirth)}
            </InfoRow>
            <InfoRow Icon={IconMapPin} label="Address">
              {patient.address || "—"}
            </InfoRow>
            <InfoRow Icon={IconClock} label="Last visit">
              {formatDate(patient.lastVisitAt)}
            </InfoRow>
            <InfoRow Icon={IconCalendarCheck} label="Next visit">
              {formatDate(patient.nextVisitAt)}
            </InfoRow>
            <InfoRow Icon={IconPlus} label="Added">
              {formatDate(patient.createdAt, { dateOnly: false })}
            </InfoRow>
          </div>
          {patient.notes && (
            <div className="mt-4 rounded-xl bg-surface-muted/60 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{patient.notes}</p>
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            {confirmDelete ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-danger/30 bg-danger/5 p-3">
                <p className="flex-1 text-sm font-semibold text-danger">Delete {fullName}? Their invoices are kept but unlinked. This can&apos;t be undone.</p>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Keep
                </Button>
                <Button variant="danger" size="sm" onClick={remove} loading={deleting} disabled={deleting}>
                  Delete patient
                </Button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="text-sm font-semibold text-danger hover:underline">
                Delete patient
              </button>
            )}
          </div>
        </AdminCard>

        <AdminCard title="Invoices" icon={IconReceipt} count={patient.invoices.length} flush>
          {patient.invoices.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No invoices" message="Invoices billed to this patient will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto p-3">
              <table className="w-full min-w-[440px] border-collapse text-left">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">Invoice</th>
                    <th className="bg-surface-muted/70 px-3 py-3">Issued</th>
                    <th className="bg-surface-muted/70 px-3 py-3">Status</th>
                    <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {patient.invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-3 py-3 font-bold text-foreground">{inv.number}</td>
                      <td className="px-3 py-3 text-foreground">{formatDate(inv.issueDate)}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-foreground">{formatMoney(inv.totalCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {editOpen && (
        <PatientForm
          open={editOpen}
          patient={patient}
          onClose={() => setEditOpen(false)}
          onSaved={(p) => {
            setEditOpen(false);
            setPatient((prev) => (prev ? { ...prev, ...p } : prev));
          }}
        />
      )}
    </div>
  );
}
