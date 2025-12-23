"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const { hash } = window.location;
    if (hash.startsWith("#access_token=")) {
      // Preserve the hash so the admin login page can consume the tokens.
      window.location.replace(`/admin/login${hash}`);
      return;
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <main className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Tacology Admin</h1>
        <p className="text-sm text-gray-600">Head to /admin or use your emailed link to sign in.</p>
      </main>
    </div>
  );
}
