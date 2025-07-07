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
  // 🔒 check cookie
  const cookieStore = await cookies();
  const adminUser = cookieStore.get("admin-user")?.value;
  if (!adminUser || !ALLOWED_USERS.includes(adminUser)) {
    redirect("/admin/login");
  }

  // 🗓️ Firestore query: only responses marked completed & after July 1
  const cutoff = Timestamp.fromDate(new Date("2025-07-01T00:00:00Z"));
  const respQuery = query(
    collection(db, "formResponses"),
    where("completed", "==", true),
    where("createdAt", ">=", cutoff)
  );
  const snap = await getDocs(respQuery);

  // 👉 filter out any docs that never answered the second question
  const docs = snap.docs.filter(doc => {
    const a = (doc.data().answers as Record<string,string> | undefined) || {};
    return typeof a["visit-from"] === "string";
  });

  // 🧮 tally counts per question (only from filtered docs)
  const tallies: Record<string, Record<string, number>> = {};
  for (const doc of docs) {
    const answers = doc.data().answers as Record<string,string>;
    for (const [qid, val] of Object.entries(answers)) {
      tallies[qid] ||= {};
      tallies[qid][val] = (tallies[qid][val] || 0) + 1;
    }
  }

  // 📊 build stats: per-question total + percentages
  const stats: StatsMap = {};
  for (const [qid, counts] of Object.entries(tallies)) {
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    const percentages: Record<string, number> = {};
    for (const [val, cnt] of Object.entries(counts)) {
      percentages[val] = Math.round((cnt / total) * 100);
    }
    stats[qid] = { counts, percentages, total };
  }

  // 📋 assemble every question in desired order
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
            {!s ? (
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
