// app/api/admin/stats/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

// Only these four users may access
const ALLOWED_USERS = ["jorge", "alberto", "jack", "diego"];

export async function GET() {
  // 1️⃣ Check the admin-user cookie
  const cookieStore = await cookies();
  const adminUser = cookieStore.get("admin-user")?.value;
  if (!adminUser || !ALLOWED_USERS.includes(adminUser)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // 2️⃣ Fetch every survey response
    const snap = await getDocs(collection(db, "formResponses"));

    // 3️⃣ Tally counts per question/answer
    const tallies: Record<string, Record<string, number>> = {};
    snap.forEach(doc => {
      const data = doc.data();
      const answers: Record<string, string> = data.answers || {};
      for (const [qid, val] of Object.entries(answers)) {
        if (!tallies[qid]) tallies[qid] = {};
        tallies[qid][val] = (tallies[qid][val] || 0) + 1;
      }
    });

    // 4️⃣ Build stats: counts + percentages + total
    const stats: Record<
      string,
      { counts: Record<string, number>; percentages: Record<string, number>; total: number }
    > = {};

    for (const [qid, counts] of Object.entries(tallies)) {
      const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
      const percentages: Record<string, number> = {};
      for (const [val, cnt] of Object.entries(counts)) {
        percentages[val] = Math.round((cnt / total) * 100);
      }
      stats[qid] = { counts, percentages, total };
    }

    return NextResponse.json(stats);
  } catch (err) {
    console.error("[admin/stats] Error:", err);
    return NextResponse.json(
      { error: "Failed to compute stats" },
      { status: 500 }
    );
  }
}
