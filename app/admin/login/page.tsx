"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";
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
    <div className="theme-navy flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <div className="text-center">
          <Eyebrow tone="dark">Admin Portal</Eyebrow>
          <h1 className="mt-6 text-heading-1 font-semibold text-foreground">Sign in to your account</h1>
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
              placeholder="admin@smileaimarketing.com"
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
