"use client";

import { useState } from "react";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AdminSettingsPage() {
  const [scraperDelay, setScraperDelay] = useState(3000);
  const [smtpHost, setSmtpHost] = useState("smtp.resend.com");
  const [success, setSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-heading-2 font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-body-small text-muted-foreground">
          Configure background workers, email delivery, and compliance parameters.
        </p>
      </div>

      {success && (
        <div role="status" className="animate-fade-in rounded-xl border border-primary/20 bg-accent-soft p-4 text-center text-body-small font-semibold text-primary">
          Settings updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 rounded-2xl border border-border bg-surface p-6">
        <FormField id="scraper-delay" label="Crawler Delay (ms)" required optionalLabel={false} hint="Throttle delay between requests to avoid rate limits.">
          <Input
            id="scraper-delay"
            type="number"
            required
            inputMode="numeric"
            value={scraperDelay}
            onChange={(e) => setScraperDelay(Number(e.target.value))}
          />
        </FormField>

        <FormField id="smtp-host" label="Outreach SMTP Server" required optionalLabel={false}>
          <Input
            id="smtp-host"
            type="text"
            required
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
          />
        </FormField>

        <Button type="submit">Save Configuration</Button>
      </form>
    </div>
  );
}
