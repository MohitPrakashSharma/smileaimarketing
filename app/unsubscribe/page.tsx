"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Eyebrow from "@/components/Eyebrow";
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-[1200px] justify-between px-6 py-6 sm:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
          Smile AI<span className="text-primary">.</span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-lg">
          <div className="space-y-3 text-center">
            <Eyebrow>Outreach Compliance</Eyebrow>
            <h1 className="text-heading-2 font-semibold text-foreground">Unsubscribe</h1>
            <p className="text-body-small text-muted-foreground">
              Enter your professional email to suppress your email and domain from all future outreach.
            </p>
          </div>

          {submitted ? (
            <div className="animate-scale-in mt-8 rounded-xl border border-primary/20 bg-accent-soft p-6 text-center">
              <p className="text-body-small font-semibold text-primary">Unsubscribed successfully</p>
              <p className="mt-2 text-body-small text-muted-foreground">
                {email} and its associated clinic domain have been added to our suppression list.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUnsubscribe} className="mt-8 space-y-4" noValidate>
              {error && (
                <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-center text-body-small font-semibold text-danger">
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
      </main>

      <footer className="border-t border-border py-6 text-center text-metadata text-muted-foreground">
        &copy; {new Date().getFullYear()} Smile AI Marketing. All rights reserved.
      </footer>
    </div>
  );
}
