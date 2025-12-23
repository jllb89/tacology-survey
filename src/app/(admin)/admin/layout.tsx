import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  requireEnv,
} from "@/lib/config";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    requireEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // read-only in this context
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // read-only in this context
          }
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/admin/login?redirect=/admin`);
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id, username")
    .eq("id", session.user.id)
    .maybeSingle();

  if (!profile) {
    redirect(`/admin/login?redirect=/admin`);
  }

  const navLinks = [
    { label: "Start", href: "/admin", icon: "home" as const },
    { label: "Responses", href: "/admin/responses", icon: "responses" as const },
    { label: "Customers", href: "/admin/customers", icon: "customers" as const },
    { label: "Survey", href: "/admin/survey", icon: "survey" as const },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="flex min-h-screen">
        <aside className="hidden md:flex w-64 flex-col border-r border-neutral-200 bg-white px-4 py-6 fixed inset-y-0 left-0">
          <div className="mb-6 flex items-center gap-3 px-2 text-sm font-semibold text-neutral-900">
            <Image src="/tacologo.svg" alt="Tacology" width={120} height={32} priority />
            <span className="sr-only">Tacology</span>
          </div>
          <AdminNav links={navLinks} />
        </aside>

        <div className="flex-1 flex flex-col md:ml-64">
          <header className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <span className="h-2 w-2 rounded-full bg-[#EB5A95]" />
              <span>Signed in</span>
            </div>
            <div className="text-sm font-medium text-neutral-800 truncate">{session.user.email}</div>
          </header>

          <main className="px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
