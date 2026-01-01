"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function parseHash(hash: string) {
  const trimmed = hash.replace(/^#/, "");
  const params = new URLSearchParams(trimmed);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  const type = params.get("type");
  return { access_token, refresh_token, type };
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/admin";
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
    const { access_token, refresh_token } = parseHash(window.location.hash);

    if (!access_token || !refresh_token) {
      setMessage("Missing auth tokens in URL hash.");
      return;
    }

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
      .catch((err) => {
        setMessage(`Sign-in failed: ${err.message || err}`);
      });
  }, [redirect, router]);

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">Auth callback</h1>
      <p className="text-sm text-gray-600">{message}</p>
      <p className="text-xs text-gray-500">If this hangs, ensure the URL still has #access_token and refresh_token.</p>
    </div>
  );
}

export default function AuthCallbackPage() {
	return (
		<Suspense fallback={<div className="space-y-2"><h1 className="text-xl font-semibold">Auth callback</h1><p className="text-sm text-gray-600">Completing sign-in...</p></div>}>
			<AuthCallbackContent />
		</Suspense>
	);
}
