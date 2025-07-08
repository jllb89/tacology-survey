// components/AdminStats.tsx
'use client';

import { useState, useMemo } from 'react';
import type { Question } from '@/data/questions';

interface Response {
  answers: Record<string, string>;
}

interface AdminStatsProps {
  responses: Response[];
  questions: Question[];
}

const LOCATION_QID = 'loc-1';
const OPEN_QID     = 'open';

// Helper to strip any emojis from strings
const stripEmojis = (str: string) =>
  str.replace(/[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu, '').trim();

export default function AdminStats({
  responses,
  questions,
}: AdminStatsProps) {
  // 1️⃣ filter state
  const [filter, setFilter] = useState<'all' | 'Brickell' | 'Wynwood'>(
    'all'
  );

  // 2️⃣ apply the filter
  const filtered = useMemo(() => {
    if (filter === 'all') return responses;
    return responses.filter((r) => r.answers[LOCATION_QID] === filter);
  }, [filter, responses]);

  // 3️⃣ tally counts + compute per‐question totals & percentages
  const stats = useMemo(() => {
    // a) build raw counts
    const tallies: Record<string, Record<string, number>> = {};
    filtered.forEach((r) => {
      for (const [qid, val] of Object.entries(r.answers)) {
        if (!val) continue;
        tallies[qid] ??= {};
        tallies[qid][val] = (tallies[qid][val] || 0) + 1;
      }
    });

    // b) for each question that has options, compute total & percentages
    const out: Record<
      string,
      { counts: Record<string, number>; percentages: Record<string, number>; total: number }
    > = {};

    questions.forEach((q) => {
      if (!q.options) return; // skip open‐text
      // If filtering, skip the first loc question entirely
      if (filter !== 'all' && q.id === LOCATION_QID) return;

      const counts = tallies[q.id] || {};
      const total = q.options.reduce(
        (sum, opt) => sum + (counts[opt] || 0),
        0
      );

      const percentages: Record<string, number> = {};
      q.options.forEach((opt) => {
        const cnt = counts[opt] || 0;
        percentages[opt] = total > 0 ? Math.round((cnt / total) * 100) : 0;
      });

      out[q.id] = { counts, percentages, total };
    });

    return out;
  }, [filtered, questions, filter]);

  // 4️⃣ collect comments for end
  const comments = useMemo(
    () =>
      filtered
        .map((r) => r.answers[OPEN_QID]?.trim())
        .filter(Boolean) as string[],
    [filtered]
  );

  return (
    <div>
      {/* filter buttons */}
      <div className="mb-6 font-medium">
        <span className="mr-4">Filter by:</span>
        {(['all', 'Brickell', 'Wynwood'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`mr-2 px-3 py-1 rounded ${
              filter === f ? 'bg-black text-white' : 'bg-white border'
            }`}
          >
            {f === 'all' ? 'View All' : f}
          </button>
        ))}
      </div>

      {/* stats grid with extra width */}
      <div className="max-w-8xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {questions.map((q) => {
          if (!q.options) return null;
          if (filter !== 'all' && q.id === LOCATION_QID) return null;

          const s = stats[q.id];
          return (
            <section key={q.id}>
              <h2 className="text-xl mb-2">
                {stripEmojis(q.text)}
              </h2>
              {!s || s.total === 0 ? (
                <p className="text-sm text-black">No responses yet.</p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {q.options.map((opt) => {
                      const cnt = s.counts[opt] || 0;
                      const pct = s.percentages[opt] || 0;
                      return (
                        <li key={opt} className="flex justify-between">
                          <span>{stripEmojis(opt)}</span>
                          <span>
                            {cnt} ({pct}%)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 pt-2 border-t border-black text-sm text-black">
                    Total responses: <strong>{s.total}</strong>
                  </p>
                </>
              )}
            </section>
          );
        })}
      </div>

      {/* comments section */}
      <section className="mt-12">
        <h2 className="text-xl mb-2">Comments</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-black">No comments submitted.</p>
        ) : (
          <ul className="space-y-2">
            {comments.map((c, i) => (
              <li
                key={i}
                className="p-3 bg-white rounded text-gray-800"
              >
                {c}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
