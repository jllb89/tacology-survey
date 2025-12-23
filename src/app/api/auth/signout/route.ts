import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, requireEnv } from "@/lib/config";

export async function POST() {
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
            // ignore write failures
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore write failures
          }
        },
      },
    },
  );

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
