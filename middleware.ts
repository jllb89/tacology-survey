import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  requireEnv,
} from "@/lib/config";

function isAdminPath(pathname: string) {
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname === "/admin" || pathname === "/admin/") return true;
  return pathname.startsWith("/admin/");
}

function isPublicAdminPath(pathname: string) {
  return pathname === "/admin/login" || pathname === "/admin/login/";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!isAdminPath(pathname) || isPublicAdminPath(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    requireEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        get(name) {
          return req.cookies.get(name)?.value;
        },
        set(name, value, options) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const redirectUrl = new URL("/admin/login", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("id, username")
    .eq("id", session.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    if (isApi) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const redirectUrl = new URL("/admin/login", req.url);
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};