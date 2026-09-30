"use client";

import { useEffect, useState } from "react";
import { AdminCard } from "@/components/admin/AdminCard";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { IconReceipt, IconSettings } from "@/components/icons";
import { ClinicProfileFields, profileFrom, type ClinicProfile } from "@/components/clinic/settings/ClinicProfileFields";
import { TAX_PRESETS, provinceName } from "@/components/clinic/settings/canada";

type Settings = ClinicProfile & {
  currency: string;
  taxLabel: string;
  taxRateBps: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
};

type Accounting = { currency: string; taxLabel: string; taxPercent: string; invoicePrefix: string };

function Notice({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border p-4 text-body-small font-semibold ${
        tone === "error" ? "border-danger/20 bg-danger/10 text-danger" : "border-primary/20 bg-accent-soft text-primary"
      }`}
    >
      {children}
    </div>
  );
}

export default function ClinicSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState<ClinicProfile | null>(null);
  const [accounting, setAccounting] = useState<Accounting | null>(null);
  const [presetNote, setPresetNote] = useState("");
  const [saving, setSaving] = useState<"profile" | "accounting" | null>(null);
  const [message, setMessage] = useState<{ section: "profile" | "accounting"; tone: "ok" | "error"; text: string } | null>(null);

  const apply = (s: Settings) => {
    setSettings(s);
    setProfile(profileFrom(s));
    setAccounting({ currency: s.currency, taxLabel: s.taxLabel, taxPercent: String(s.taxRateBps / 100), invoicePrefix: s.invoicePrefix });
  };

  useEffect(() => {
    fetch("/api/clinic/settings")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        apply(data.settings);
      })
      .catch((err: Error) => setLoadError(err.message || "Couldn't load settings"));
  }, []);

  const save = async (section: "profile" | "accounting", body: object) => {
    setMessage(null);
    setSaving(section);
    try {
      const res = await fetch("/api/clinic/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save");
      apply(data.settings);
      setMessage({ section, tone: "ok", text: "Saved." });
    } catch (err) {
      setMessage({ section, tone: "error", text: err instanceof Error ? err.message : "Something went wrong" });
    } finally {
      setSaving(null);
    }
  };

  const saveAccounting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accounting) return;
    const percent = Number(accounting.taxPercent);
    if (!Number.isFinite(percent) || percent < 0 || percent > 50) {
      setMessage({ section: "accounting", tone: "error", text: "Enter a tax rate between 0 and 50%." });
      return;
    }
    save("accounting", {
      currency: accounting.currency,
      taxLabel: accounting.taxLabel,
      taxRateBps: Math.round(percent * 100),
      invoicePrefix: accounting.invoicePrefix,
    });
  };

  const applyPreset = (province: string) => {
    const preset = TAX_PRESETS.find((p) => p.province === province);
    if (!preset || !accounting) return;
    setAccounting({ ...accounting, taxLabel: preset.label, taxPercent: String(preset.ratePercent) });
    setPresetNote(preset.note ?? "");
  };

  if (loadError) return <div className="admin-card p-8 text-center text-sm font-semibold text-danger">{loadError}</div>;
  if (!settings || !profile || !accounting) return <div className="admin-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  const previewNumber = `${accounting.invoicePrefix || "INV"}-${String(settings.nextInvoiceNumber).padStart(4, "0")}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-foreground sm:text-[32px]">Settings</h1>
        <p className="mt-1 text-body-small text-muted-foreground">Your clinic&apos;s details and the defaults used on invoices.</p>
      </div>

      <AdminCard title="Clinic profile" icon={IconSettings} subtitle="Shown on invoices and used by the social media assistant.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save("profile", profile);
          }}
          className="space-y-5"
          noValidate
        >
          {message?.section === "profile" && <Notice tone={message.tone}>{message.text}</Notice>}
          <ClinicProfileFields value={profile} onChange={setProfile} idPrefix="settings" />
          <div className="flex justify-end">
            <Button type="submit" loading={saving === "profile"} disabled={saving !== null}>
              Save profile
            </Button>
          </div>
        </form>
      </AdminCard>

      <AdminCard title="Accounting defaults" icon={IconReceipt} subtitle="Applied to new invoices. Existing invoices keep the rate they were issued with.">
        <form onSubmit={saveAccounting} className="space-y-5" noValidate>
          {message?.section === "accounting" && <Notice tone={message.tone}>{message.text}</Notice>}

          <FormField id="tax-preset" label="Fill in from province" hint="Sets the tax label and rate below. You can still edit them.">
            <Select id="tax-preset" defaultValue="" onChange={(e) => applyPreset(e.target.value)}>
              <option value="">Choose a province…</option>
              {TAX_PRESETS.map((p) => (
                <option key={p.province} value={p.province}>
                  {provinceName(p.province)} — {p.label} {p.ratePercent}%
                </option>
              ))}
            </Select>
          </FormField>
          {presetNote && <p className="-mt-2 text-xs text-muted-foreground">{presetNote}</p>}

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="tax-label" label="Tax label" required optionalLabel={false}>
              <Input id="tax-label" value={accounting.taxLabel} onChange={(e) => setAccounting({ ...accounting, taxLabel: e.target.value })} required />
            </FormField>
            <FormField id="tax-rate" label="Tax rate (%)" required optionalLabel={false}>
              <Input
                id="tax-rate"
                type="number"
                inputMode="decimal"
                min={0}
                max={50}
                step="0.01"
                value={accounting.taxPercent}
                onChange={(e) => setAccounting({ ...accounting, taxPercent: e.target.value })}
                required
              />
            </FormField>
            <FormField id="currency" label="Currency" required optionalLabel={false}>
              <Select id="currency" value={accounting.currency} onChange={(e) => setAccounting({ ...accounting, currency: e.target.value })}>
                <option value="CAD">CAD — Canadian dollar</option>
                <option value="USD">USD — US dollar</option>
              </Select>
            </FormField>
          </div>

          <p className="rounded-xl bg-surface-muted/70 p-3 text-xs text-muted-foreground">
            Most dental treatment by a licensed dentist is exempt from GST/HST in Canada. Mark those invoice lines as non-taxable; tax
            applies to taxable items such as purely cosmetic services or products you sell. Check with your accountant.
          </p>

          <FormField id="invoice-prefix" label="Invoice number prefix" required optionalLabel={false} hint={`Next invoice will be numbered ${previewNumber}.`}>
            <Input
              id="invoice-prefix"
              value={accounting.invoicePrefix}
              maxLength={12}
              onChange={(e) => setAccounting({ ...accounting, invoicePrefix: e.target.value.toUpperCase() })}
              required
            />
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" loading={saving === "accounting"} disabled={saving !== null}>
              Save accounting defaults
            </Button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
