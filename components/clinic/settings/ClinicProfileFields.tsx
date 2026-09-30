"use client";

import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { PROVINCES } from "./canada";

export type ClinicProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  website: string;
};

export const EMPTY_PROFILE: ClinicProfile = { name: "", email: "", phone: "", address: "", city: "", province: "", website: "" };

export function profileFrom(c: Partial<Record<keyof ClinicProfile, string | null>>): ClinicProfile {
  return {
    name: c.name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    province: c.province ?? "",
    website: c.website ?? "",
  };
}

/** Clinic contact details — shared by the superadmin clinic forms and the clinic's own settings. */
export function ClinicProfileFields({
  value,
  onChange,
  idPrefix = "clinic",
}: {
  value: ClinicProfile;
  onChange: (next: ClinicProfile) => void;
  idPrefix?: string;
}) {
  const set = (k: keyof ClinicProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const id = (k: string) => `${idPrefix}-${k}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormField id={id("name")} label="Clinic name" required optionalLabel={false}>
          <Input id={id("name")} value={value.name} onChange={set("name")} required />
        </FormField>
      </div>
      <FormField id={id("email")} label="Clinic email">
        <Input id={id("email")} type="email" inputMode="email" value={value.email} onChange={set("email")} />
      </FormField>
      <FormField id={id("phone")} label="Phone">
        <Input id={id("phone")} type="tel" value={value.phone} onChange={set("phone")} />
      </FormField>
      <div className="sm:col-span-2">
        <FormField id={id("address")} label="Street address">
          <Input id={id("address")} autoComplete="street-address" value={value.address} onChange={set("address")} />
        </FormField>
      </div>
      <FormField id={id("city")} label="City">
        <Input id={id("city")} value={value.city} onChange={set("city")} />
      </FormField>
      <FormField id={id("province")} label="Province / territory">
        <Select id={id("province")} value={value.province} onChange={set("province")}>
          <option value="">—</option>
          {PROVINCES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="sm:col-span-2">
        <FormField id={id("website")} label="Website">
          <Input id={id("website")} type="url" inputMode="url" placeholder="https://" value={value.website} onChange={set("website")} />
        </FormField>
      </div>
    </div>
  );
}
