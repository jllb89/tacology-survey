import { NextRequest, NextResponse } from "next/server";

const ALLOWED_USERS = ["jorge", "alberto", "jack", "diego"];

export async function POST(request: NextRequest) {
    const { username, password } = await request.json();

    // 1️⃣ Validate
    if (!ALLOWED_USERS.includes(username) || password !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json(
            { success: false, error: "Invalid username or password" },
            { status: 401 }
        );
    }

    // 2️⃣ On success, set a secure, HttpOnly cookie
    const res = NextResponse.json({ success: true });
    res.cookies.set({
        name: "admin-user",
        value: username,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",              // ← root so it’s sent everywhere
        sameSite: "strict",
        maxAge: 60 * 60 * 24,
    });


    return res;
}
