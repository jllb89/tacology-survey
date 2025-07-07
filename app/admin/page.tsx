// app/admin/page.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  initialLocationQuestion,
  visitingFromQuestion,
  hearAboutQuestion,
  firstVisitQuestion,
  locationFollowUpQuestions,
  serviceQuestions,
  foodQuestions,
  salsaQuestions,
  brandValueQuestions,
  recommendQuestion,
  openQuestion,
  Question,
} from "@/data/questions";

type StatsMap = Record<
  string,
  {
    counts: Record<string, number>;
    percentages: Record<string, number>;
    total: number;
  }
>;

const ALLOWED_USERS = ["jorge", "alberto", "jack", "diego"];

export default async function AdminPage(): Promise<ReactNode> {
  // 🔒 Guard with cookie
  const cookieStore = await cookies();
  const adminUser = cookieStore.get("admin-user")?.value;
  if (!adminUser || !ALLOWED_USERS.includes(adminUser)) {
    redirect("/admin/login");
  }

  // 🗓️ Query only completed responses since July 1, 2025
  const cutoff = Timestamp.fromDate(new Date("2025-07-01T00:00:00Z"));
  const respQuery = query(
    collection(db, "formResponses"),
    where("completed", "==", true),
    where("createdAt", ">=", cutoff)
  );
  const snap = await getDocs(respQuery);

  // 🧮 Raw tallies of every answer (including blanks)
  const tallies: Record<string, Record<string, number>> = {};
  snap.docs.forEach((doc) => {
    const answers = (doc.data().answers as Record<string, string>) || {};
    for (const [qid, val] of Object.entries(answers)) {
      tallies[qid] ||= {};
      tallies[qid][val] = (tallies[qid][val] || 0) + 1;
    }
  });

  // 📋 All questions in display order
  const allQuestions: Question[] = [
    initialLocationQuestion,
    visitingFromQuestion,
    hearAboutQuestion,
    firstVisitQuestion,
    ...locationFollowUpQuestions,
    ...serviceQuestions,
    ...foodQuestions,
    ...salsaQuestions,
    ...brandValueQuestions,
    recommendQuestion,
    openQuestion,
  ];

  // 📊 Build per-question stats: only count defined options
  const stats: StatsMap = {};
  for (const q of allQuestions) {
    const counts = tallies[q.id] || {};
    // sum only the counts for valid options
    const total = (q.options ?? []).reduce(
      (sum, opt) => sum + (counts[opt] || 0),
      0
    );
    const percentages: Record<string, number> = {};
    (q.options ?? []).forEach((opt) => {
      const cnt = counts[opt] || 0;
      percentages[opt] = total > 0 ? Math.round((cnt / total) * 100) : 0;
    });
    stats[q.id] = { counts, percentages, total };
  }

  // 🎨 Render Dashboard
  return (
    <div className="p-8 max-w-4xl mx-auto font-bourbon">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl">🛠️ Admin Dashboard</h1>
        <a
          href="/api/admin/logout"
          className="text-sm text-gray-600 hover:underline"
        >
          Logout
        </a>
      </div>

      {allQuestions.map((q) => {
        const s = stats[q.id];
        return (
          <section key={q.id} className="mb-8">
            <h2 className="text-xl font-semibold mb-2">{q.text}</h2>
            {s.total === 0 ? (
              <p className="text-sm text-gray-600">No responses yet.</p>
            ) : (
              <>
                <ul className="space-y-1">
                  {q.options?.map((opt) => {
                    const cnt = s.counts[opt] || 0;
                    const pct = s.percentages[opt] || 0;
                    return (
                      <li
                        key={opt}
                        className="flex justify-between border-b pb-1"
                      >
                        <span>{opt}</span>
                        <span>
                          {cnt} ({pct}%)
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-1 text-sm text-gray-600">
                  Total responses: <strong>{s.total}</strong>
                </p>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
