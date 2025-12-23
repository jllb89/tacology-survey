import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, requireEnv } from "@/lib/config";

export async function POST(req: Request) {
  const { access_token, refresh_token } = await req.json().catch(() => ({}));

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
  }

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
            // ignore write failures in read-only contexts
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // ignore write failures in read-only contexts
          }
        },
      },
    },
  );

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
