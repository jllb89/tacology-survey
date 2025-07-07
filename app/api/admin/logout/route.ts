// app/api/admin/logout/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Redirect back to login
  const url = new URL("/admin/login", request.url);
  const res = NextResponse.redirect(url);

  // Clear the admin-user cookie
  res.cookies.set({
    name: "admin-user",
    value: "",
    path: "/",
    maxAge: 0,
  });

  return res;
}
