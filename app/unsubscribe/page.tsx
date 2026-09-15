"use client";

import { useRef, useState } from "react";
import Eyebrow from "@/components/Eyebrow";
import MinimalShell from "@/components/MinimalShell";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function UnsubscribePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to unsubscribe");
      }

      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      submitting.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <MinimalShell>
      <div className="card-elevated w-full max-w-lg p-6 sm:p-10">
        <div className="space-y-4">
          <Eyebrow>Outreach Compliance</Eyebrow>
          <h1 className="text-heading-2 text-foreground">Unsubscribe</h1>
          <p className="text-body text-muted-foreground">
            Enter your professional email to suppress your email and domain from all future outreach.
          </p>
        </div>

        {submitted ? (
          <div className="animate-scale-in mt-8 rounded-[var(--radius-medium)] border border-primary/20 bg-accent-soft p-6">
            <p className="text-body font-semibold text-primary-ink">Unsubscribed successfully</p>
            <p className="mt-2 text-body-small text-muted-foreground">
              {email} and its associated clinic domain have been added to our suppression list.
            </p>
          </div>
        ) : (
          <form onSubmit={handleUnsubscribe} className="mt-8 space-y-5" noValidate>
            {error && (
              <div role="alert" className="rounded-[var(--radius-small)] border border-danger/20 bg-danger/5 px-4 py-3 text-body-small font-semibold text-danger">
                {error}
              </div>
            )}

            <FormField id="email-address" label="Email Address" required optionalLabel={false}>
              <Input
                id="email-address"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="e.g. owner@clinicwebsite.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <Button type="submit" variant="danger" fullWidth loading={loading} disabled={loading}>
              Confirm Opt-out
            </Button>
          </form>
        )}
      </div>
    </MinimalShell>
  );
}
