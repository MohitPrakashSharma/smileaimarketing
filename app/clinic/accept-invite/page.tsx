"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";
import { Wordmark } from "@/components/Wordmark";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type Invite = { name: string; email: string; clinicName: string };

function AcceptInvite() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [fetchError, setFetchError] = useState("");
  const loadError = token ? fetchError : "This invite link is missing its token.";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/clinic/auth/accept-invite?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setInvite(data);
        setName(data.name);
      })
      .catch((err: Error) => setFetchError(err.message || "Couldn't load this invite."));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    if (password !== confirm) return setError("The two passwords don't match.");
    setLoading(true);
    try {
      const res = await fetch("/api/clinic/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't accept the invite");
      router.push("/clinic");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background-alt px-6 py-12 text-foreground">
      <Wordmark full />
      <div className="admin-card w-full max-w-md space-y-8 p-8 shadow-lg">
        {loadError ? (
          <div className="text-center">
            <h1 className="font-display text-heading-2 font-bold text-foreground">Invite unavailable</h1>
            <p className="mt-2 text-body-small text-muted-foreground">{loadError}</p>
          </div>
        ) : !invite ? (
          <p className="text-center text-sm text-muted-foreground">Loading invite…</p>
        ) : (
          <>
            <div className="text-center">
              <Eyebrow>Dentist Panel</Eyebrow>
              <h1 className="mt-5 font-display text-heading-1 font-bold tracking-[-0.02em] text-foreground">Join {invite.clinicName}</h1>
              <p className="mt-2 text-body-small text-muted-foreground">
                Choose a password for <strong className="text-foreground">{invite.email}</strong>
              </p>
            </div>
            <form className="space-y-5" onSubmit={submit} noValidate>
              {error && (
                <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-center text-body-small font-semibold text-danger">
                  {error}
                </div>
              )}
              <FormField id="name" label="Your name" required optionalLabel={false}>
                <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </FormField>
              <FormField id="password" label="Password" required optionalLabel={false}>
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </FormField>
              <FormField id="confirm" label="Confirm password" required optionalLabel={false}>
                <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </FormField>
              <Button type="submit" fullWidth loading={loading} disabled={loading}>
                Set password and sign in
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense>
      <AcceptInvite />
    </Suspense>
  );
}
