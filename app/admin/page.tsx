// app/admin/page.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AdminStats from "@/components/AdminStats";
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

const ALLOWED_USERS = ["jorge","alberto","jack","diego"];

export default async function AdminPage(): Promise<ReactNode> {
  // Auth guard
  const store = await cookies();
  const u = store.get("admin-user")?.value;
  if (!u || !ALLOWED_USERS.includes(u)) redirect("/admin/login");

  // Fetch raw responses, but only keep the plain `answers` map
  const snap = await getDocs(collection(db, "formResponses"));
  const responses: { answers: Record<string,string> }[] = snap.docs.map(d => {
    const data = d.data() as any;
    return {
      answers: (data.answers ?? {}) as Record<string,string>
    };
  });


  // Build question list
  const questions: Question[] = [
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
    <div className="p-8 max-w-8xl mx-auto font-bourbon">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl">🛠️ Admin Dashboard</h1>
        <a href="/api/admin/logout" className="text-sm text-black hover:underline">
          Logout
        </a>
      </div>
      <AdminStats responses={responses} questions={questions} />
    </div>
  );
}
