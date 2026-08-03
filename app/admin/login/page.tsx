"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Eyebrow from "@/components/Eyebrow";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@smileaimarketing.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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

      router.push("/admin/campaigns");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6 py-12 text-white">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
        <div className="text-center">
          <Eyebrow tone="dark">Admin Portal</Eyebrow>
          <h2 className="mt-6 font-display text-3xl font-medium tracking-tight text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 font-body text-sm text-slate">
            Smile AI Marketing Management Console
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-xl bg-coral/10 border border-coral/20 p-4 text-center text-sm font-semibold text-coral">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="email-address" className="block font-body text-xs font-semibold uppercase tracking-wider text-slate mb-2">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-body text-white placeholder-slate focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                placeholder="admin@smileaimarketing.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block font-body text-xs font-semibold uppercase tracking-wider text-slate mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-body text-white placeholder-slate focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-full bg-teal py-4 px-4 font-body text-sm font-bold text-ink transition-colors hover:bg-teal-deep hover:text-white disabled:bg-slate disabled:text-ink-2"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
