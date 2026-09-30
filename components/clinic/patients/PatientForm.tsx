"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Drawer, FormError, toDateInput } from "./Drawer";
import type { Patient } from "./types";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  tags: string;
  status: "ACTIVE" | "INACTIVE";
  lastVisitAt: string;
  nextVisitAt: string;
  notes: string;
};

function initial(p?: Patient | null): FormState {
  return {
    firstName: p?.firstName ?? "",
    lastName: p?.lastName ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    dateOfBirth: toDateInput(p?.dateOfBirth),
    address: p?.address ?? "",
    tags: p?.tags.join(", ") ?? "",
    status: p?.status ?? "ACTIVE",
    lastVisitAt: toDateInput(p?.lastVisitAt),
    nextVisitAt: toDateInput(p?.nextVisitAt),
    notes: p?.notes ?? "",
  };
}

/** Create (patient = null) or edit a patient in a slide-over. Mount it only while open so it starts from fresh values. */
export function PatientForm({
  open,
  patient,
  onClose,
  onSaved,
}: {
  open: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSaved: (p: Patient) => void;
}) {
  const [form, setForm] = useState<FormState>(initial(patient));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!form.firstName.trim() || !form.lastName.trim()) return setError("First and last name are required.");
    setSaving(true);
    try {
      const body = {
        ...form,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const res = await fetch(patient ? `/api/clinic/patients/${patient.id}` : "/api/clinic/patients", {
        method: patient ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save the patient");
      onSaved(data.patient);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the patient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={patient ? `Edit ${patient.firstName} ${patient.lastName}` : "Add patient"}
      subtitle="Contact details and visits only — no clinical records."
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button size="sm" onClick={() => submit()} loading={saving} disabled={saving}>
            {patient ? "Save changes" : "Add patient"}
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="p-first" label="First name" required>
            <Input id="p-first" value={form.firstName} onChange={set("firstName")} autoComplete="off" />
          </FormField>
          <FormField id="p-last" label="Last name" required>
            <Input id="p-last" value={form.lastName} onChange={set("lastName")} autoComplete="off" />
          </FormField>
          <FormField id="p-email" label="Email">
            <Input id="p-email" type="email" inputMode="email" value={form.email} onChange={set("email")} autoComplete="off" />
          </FormField>
          <FormField id="p-phone" label="Phone">
            <Input id="p-phone" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
          </FormField>
          <FormField id="p-dob" label="Date of birth">
            <Input id="p-dob" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          </FormField>
          <FormField id="p-status" label="Status" optionalLabel={false}>
            <Select id="p-status" value={form.status} onChange={set("status")}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </FormField>
          <FormField id="p-last-visit" label="Last visit">
            <Input id="p-last-visit" type="date" value={form.lastVisitAt} onChange={set("lastVisitAt")} />
          </FormField>
          <FormField id="p-next-visit" label="Next visit">
            <Input id="p-next-visit" type="date" value={form.nextVisitAt} onChange={set("nextVisitAt")} />
          </FormField>
        </div>
        <FormField id="p-address" label="Address">
          <Input id="p-address" value={form.address} onChange={set("address")} autoComplete="off" />
        </FormField>
        <FormField id="p-tags" label="Tags" hint="Separate with commas, e.g. new patient, family plan">
          <Input id="p-tags" value={form.tags} onChange={set("tags")} />
        </FormField>
        <FormField id="p-notes" label="Notes" hint="Admin notes such as preferences or insurance provider. Don't record clinical details here.">
          <Textarea id="p-notes" value={form.notes} onChange={set("notes")} rows={4} />
        </FormField>
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Drawer>
  );
}
