// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_USERS = ["jorge", "alberto", "jack", "diego", "susana"];

export async function POST(request: NextRequest) {
  // 1️⃣ Parse & normalize inputs
  const { username: rawUser, password: rawPass } = await request.json();
  const username = (rawUser ?? "").toString().trim().toLowerCase();
  const password = (rawPass ?? "").toString().trim();

  console.log("[admin/login] attempt:", { username, password });

  // 2️⃣ Validate credentials
  if (!ALLOWED_USERS.includes(username) || password !== process.env.ADMIN_PASSWORD) {
    console.warn("[admin/login] invalid credentials for:", username);
    return NextResponse.json(
      { success: false, error: "Invalid username or password" },
      { status: 401 }
    );
  }

  // 3️⃣ On success, set a secure, HttpOnly cookie at root path
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: "admin-user",
    value: username,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",         // sent with all requests
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 1 day
  });

  console.log("[admin/login] login successful for:", username);
  return res;
}
