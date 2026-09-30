"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminCard } from "@/components/admin/AdminCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import { IconUsers, IconSearch, IconFileText } from "@/components/icons";
import { PatientForm } from "@/components/clinic/patients/PatientForm";
import { formatDate } from "@/components/clinic/patients/Drawer";
import type { Patient } from "@/components/clinic/patients/types";

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [formOpen, setFormOpen] = useState(false);

  // Debounce typing so every keystroke doesn't hit the API.
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  params.set("sort", sort);
  const qs = params.toString();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clinic/patients?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load patients");
      setError("");
      setPatients(data.patients);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load patients");
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filtered = query || status;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-heading-3 font-bold text-foreground">Patients</h1>
          <p className="mt-1 text-sm text-muted-foreground">Contact details and visit dates for everyone the clinic sees.</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/clinic/patients/export?${qs}`}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            <IconFileText className="h-4 w-4" /> Export CSV
          </a>
          <Button onClick={() => setFormOpen(true)}>+ Add patient</Button>
        </div>
      </div>

      <AdminCard title="Patient list" icon={IconUsers} count={total} subtitle={filtered ? `${patients.length} matching` : undefined} flush>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email or phone…"
              aria-label="Search patients"
              className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)} className="!h-11 sm:w-40">
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
            <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} className="!h-11 sm:w-44">
              <option value="name">Name A–Z</option>
              <option value="recent">Recently added</option>
              <option value="lastVisit">Last visit</option>
              <option value="nextVisit">Next visit</option>
            </Select>
          </div>
        </div>

        {error && <p className="p-5 text-sm font-semibold text-danger">{error}</p>}

        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading patients…</p>
        ) : patients.length === 0 ? (
          <div className="p-5">
            <EmptyState
              compact={false}
              title={filtered ? "No patients match" : "No patients yet"}
              message={filtered ? "Try a different search or status." : "Add your first patient to start building the list."}
              action={filtered ? undefined : { label: "Add patient", onClick: () => setFormOpen(true) }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="rounded-l-xl bg-surface-muted/70 px-3 py-3">Patient</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Contact</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Status</th>
                  <th className="bg-surface-muted/70 px-3 py-3">Last visit</th>
                  <th className="rounded-r-xl bg-surface-muted/70 px-3 py-3">Next visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {patients.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-muted/40">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-primary-ink">
                          {p.firstName.charAt(0).toUpperCase()}
                          {p.lastName.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/clinic/patients/${p.id}`} className="font-bold text-foreground hover:text-primary-ink hover:underline">
                            {p.lastName}, {p.firstName}
                          </Link>
                          {p.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {p.tags.map((t) => (
                                <span key={t} className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-foreground">{p.phone || "—"}</p>
                      <p className="text-[11px] text-muted-foreground">{p.email || "No email"}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-3 text-foreground">{formatDate(p.lastVisitAt)}</td>
                    <td className="px-3 py-3 text-foreground">{formatDate(p.nextVisitAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {formOpen && (
        <PatientForm
          open={formOpen}
          patient={null}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
