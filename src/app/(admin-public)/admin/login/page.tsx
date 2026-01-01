"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  requireEnv,
} from "@/lib/config";

const supabase = createClient(
  requireEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
);


function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-handle magic/invite links that drop tokens in the hash
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.startsWith("#access_token=")) return;
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;

    // Persist session cookies server-side so middleware/layout can read it
    fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const { error: msg } = await res.json().catch(() => ({}));
          throw new Error(msg || "Failed to set session");
        }
        router.replace(redirect);
        router.refresh();
      })
      .catch((err) => setError(err?.message || "Failed to set session"));
  }, [redirect, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      const access_token = data.session?.access_token;
      const refresh_token = data.session?.refresh_token;

      if (!access_token || !refresh_token) {
        setError("Missing session tokens");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        setError(msg || "Failed to persist session");
        setLoading(false);
        return;
      }

      router.replace(redirect);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-3 text-center">
          <div className="flex justify-center">
            <Image src="/tacologo.svg" alt="Tacology" width={120} height={32} priority />
          </div>
          <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
            <span className="inline-flex h-2 w-2 rounded-full bg-[#EB5A95]" />
            <span>Admin Console</span>
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">Sign in</h1>
          <p className="text-sm text-neutral-600">Use your admin email and password to continue.</p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-neutral-200 bg-white px-6 py-6 shadow-sm"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-800">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-[#EB5A95]/50 focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/30"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-800">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 pr-10 text-sm text-neutral-900 shadow-sm focus:border-[#EB5A95]/50 focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/30"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-md px-2 text-neutral-500 hover:text-neutral-800 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path d="M10.6 10.6a2.5 2.5 0 0 0 3.5 3.5" />
                    <path d="M9.9 4.3A8.4 8.4 0 0 1 12 4c5 0 9 6 9 8 0 .9-1 2.7-2.6 4.3m-3 2A8.7 8.7 0 0 1 12 20c-5 0-9-6-9-8 0-.9 1-2.7 2.6-4.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#EB5A95] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#d94f87] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginContent />
    </Suspense>
  );
}
