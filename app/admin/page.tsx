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

// Emoji-strip helper
function stripEmojis(text: string) {
    return text.replace(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu, "").trim();
}

export default async function AdminPage(): Promise<ReactNode> {
    // Auth guard
    const cookieStore = await cookies();
    const adminUser = cookieStore.get("admin-user")?.value;
    if (!adminUser || !ALLOWED_USERS.includes(adminUser)) {
        redirect("/admin/login");
    }

    // Firestore query: only completed since July 1
    const cutoff = Timestamp.fromDate(new Date("2025-07-01T00:00:00Z"));
    const respQuery = query(
        collection(db, "formResponses"),
        where("completed", "==", true),
        where("createdAt", ">=", cutoff)
    );
    const snap = await getDocs(respQuery);

    // Tally fixed-option answers; collect free-text
    const tallies: Record<string, Record<string, number>> = {};
    const openTextResponses: string[] = [];

    snap.docs.forEach((doc) => {
        const answers = (doc.data().answers as Record<string, string>) || {};
        for (const [qid, val] of Object.entries(answers)) {
            if (qid === openQuestion.id) {
                if (val.trim()) openTextResponses.push(val.trim());
            } else {
                tallies[qid] ||= {};
                tallies[qid][val] = (tallies[qid][val] || 0) + 1;
            }
        }
    });

    // Build question list (excluding openQuestion here)
    const fixedQuestions: Question[] = [
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
    ];

    // Compute stats for each fixed question
    const stats: StatsMap = {};
    fixedQuestions.forEach((q) => {
        const counts = tallies[q.id] || {};
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
    });

    return (
        <div className="p-8 max-w-6xl mx-auto font-bourbon">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl">Survey Responses</h1>
                <a href="/api/admin/logout" className="text-sm text-gray-600 hover:underline">
                    Logout
                </a>
            </div>

            {/* two-column grid for fixed questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {fixedQuestions.map((q) => {
                    const s = stats[q.id];
                    return (
                        <section key={q.id} className="mb-8">
                            <h2 className="text-lg font-semibold mb-2">{stripEmojis(q.text)}</h2>
                            {!s || s.total === 0 ? (
                                <p className="text-xs text-gray-600">No responses yet.</p>
                            ) : (
                                <>
                                    <ul className="space-y-3">
                                        {q.options!.map((opt) => {
                                            const cnt = s.counts[opt] || 0;
                                            const pct = s.percentages[opt] || 0;
                                            return (
                                                <li key={opt} className="flex justify-between mt-2">
                                                    <span>{stripEmojis(opt)}</span>
                                                    <span>{cnt} ({pct}%)</span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <p className="mt-4 pt-4 text-sm border-t-2 border-black">
                                        Total responses: <strong>{s.total}</strong>
                                    </p>
                                </>
                            )}
                        </section>
                    );
                })}
            </div>

            {/* full-width open-feedback section */}
            <section className="mt-12">
                <h2 className="text-lg font-semibold mb-2">
                    {stripEmojis(openQuestion.text)}
                </h2>
                {openTextResponses.length === 0 ? (
                    <p className="text-xs text-gray-600">No comments yet.</p>
                ) : (
                    <ul className="space-y-2 px-2">
                        {openTextResponses.map((txt, i) => (
                            <li
                                key={i}
                                className="p-2 border border-[#EB5A95] rounded bg-black text-[#EB5A95]"
                            >
                                {txt}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

        </div>
    );
}
