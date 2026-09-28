"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";
import { Wordmark } from "@/components/Wordmark";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      submitting.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background-alt px-6 py-12 text-foreground">
      <Wordmark full />
      <div className="admin-card w-full max-w-md space-y-8 p-8 shadow-lg">
        <div className="text-center">
          <Eyebrow>Admin Portal</Eyebrow>
          <h1 className="mt-5 font-display text-heading-1 font-bold tracking-[-0.02em] text-foreground">Sign in to your account</h1>
          <p className="mt-2 text-body-small text-muted-foreground">Smile AI Marketing Management Console</p>
        </div>

        <form className="space-y-5" onSubmit={handleLogin} noValidate>
          {error && (
            <div role="alert" className="rounded-xl border border-danger/20 bg-danger/10 p-4 text-center text-body-small font-semibold text-danger">
              {error}
            </div>
          )}

          <FormField id="email-address" label="Email Address" required optionalLabel={false}>
            <Input
              id="email-address"
              name="email"
              type="email"
              required
              autoComplete="username"
              inputMode="email"
              placeholder="hello@smileaimarketing.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>

          <FormField id="password" label="Password" required optionalLabel={false}>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>

          <Button type="submit" fullWidth loading={loading} disabled={loading}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}
