// components/AdminStats.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
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

  // 4.b️⃣ paginate comments (10 per page)
  const PAGE_SIZE = 10;
  const [commentPage, setCommentPage] = useState(0); // zero-based
  const totalCommentPages = Math.ceil(comments.length / PAGE_SIZE);
  const startIdx = commentPage * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const pageComments = comments.slice(startIdx, endIdx);
  // Reset to first page when filter (and thus comments) changes
  useEffect(() => {
    setCommentPage(0);
  }, [filter]);
  // Clamp page when data shrinks
  useEffect(() => {
    if (commentPage > 0 && startIdx >= comments.length) {
      const last = Math.max(0, (Math.ceil(comments.length / PAGE_SIZE) || 1) - 1);
      setCommentPage(last);
    }
  }, [commentPage, startIdx, comments.length]);

  // 5️⃣ dynamic total entries (respects filter)
  const totalEntries = filtered.length;

  // 6️⃣ tiny donut pie chart (CSS conic-gradient) — no deps
  const ACCENT = '#F59EC0';
  const PALETTE = [
    '#ff2ec1', // neon pink
    '#00eaff', // neon cyan
    '#b8ff00', // neon lime
    '#faff00', // neon yellow
    '#b026ff', // neon purple
    '#ff8a00', // neon orange
    '#00ffa3', // neon mint
    '#00b3ff', // neon blue
  ];

  const strip = stripEmojis; // alias for brevity below

  function buildConicGradient(segments: { value: number; color: string }[]) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    if (total <= 0) return 'conic-gradient(#e5e7eb 0 100%)'; // gray-200 fallback
    let acc = 0;
    const parts: string[] = [];
    segments.forEach((seg) => {
      if (seg.value <= 0) return;
      const start = (acc / total) * 100;
      acc += seg.value;
      const end = (acc / total) * 100;
      parts.push(`${seg.color} ${start}% ${end}%`);
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  function PieChart({
    segments,
    size = 160,
  }: {
    segments: { label: string; value: number; color: string }[];
    size?: number;
  }) {
    const bg = buildConicGradient(segments);
    const inner = Math.floor(size * 0.62);
    return (
      <div
        className="relative"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <div
          className="rounded-full"
          style={{ width: size, height: size, background: bg }}
        />
        <div
          className="absolute inset-0 m-auto rounded-full"
          style={{ width: inner, height: inner, backgroundColor: ACCENT }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* filter buttons */}
      <div className="mb-6 font-medium">
        <span className="mr-4">Filter by:</span>
        {(['all', 'Brickell', 'Wynwood'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`mr-2 px-3 py-1 rounded border transition`}
            style={
              filter === f
                ? { backgroundColor: '#ffffff', borderColor: ACCENT, color: '#000' }
                : { backgroundColor: ACCENT, borderColor: ACCENT, color: '#000' }
            }
          >
            {f === 'all' ? 'View All' : f}
          </button>
        ))}
      </div>

      {/* total entries */}
      <p className="mb-6 text-sm text-black">
        Total entries{filter !== 'all' ? ` (${filter})` : ''}: <strong>{totalEntries}</strong>
      </p>

  {/* stats grid: one question per row */}
  <div className="max-w-8xl mx-auto grid grid-cols-1 gap-10 xl:gap-12">
        {questions.map((q) => {
          if (!q.options) return null;
          if (filter !== 'all' && q.id === LOCATION_QID) return null;

          const s = stats[q.id];
          return (
    <section key={q.id} className="rounded p-4 md:p-6 bg-white/40">
              <h2 className="text-xl mb-2">
                {stripEmojis(q.text)}
              </h2>
              {!s || s.total === 0 ? (
                <p className="text-sm text-black">No responses yet.</p>
              ) : (
                <>
      {/* chart + legend */}
                  <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                    <PieChart
                      segments={q.options.map((opt, i) => ({
                        label: opt,
                        value: s.counts[opt] || 0,
                        color: PALETTE[i % PALETTE.length],
                      }))}
                    />
                    {/* right side: option name + percentage only */}
                    <ul className="flex-1 space-y-2 min-w-0">
                      {q.options.map((opt, i) => {
                        const pct = s.percentages[opt] || 0;
                        const color = PALETTE[i % PALETTE.length];
                        return (
                          <li key={opt} className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className="inline-block w-3 h-3 rounded-sm border"
                                style={{ backgroundColor: color, borderColor: '#00000020' }}
                                aria-hidden
                              />
                              <span className="truncate">{strip(opt)}</span>
                            </span>
                            <span className="tabular-nums font-medium">{pct}%</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
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
          <>
            <ul className="space-y-2">
              {pageComments.map((c, i) => (
                <li
                  key={`${commentPage}-${i}`}
                  className="p-3 rounded text-black border"
                  style={{ backgroundColor: ACCENT, borderColor: ACCENT }}
                >
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setCommentPage((p) => Math.max(0, p - 1))}
                disabled={commentPage === 0}
                className={`px-3 py-1 rounded border ${
                  commentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={
                  commentPage === 0
                    ? { backgroundColor: '#ffffff', borderColor: ACCENT, color: '#000' }
                    : { backgroundColor: ACCENT, borderColor: ACCENT, color: '#000' }
                }
                aria-label="Previous comments page"
              >
                Prev
              </button>
              <div className="text-sm text-black">
                Page <strong>{commentPage + 1}</strong> of <strong>{Math.max(totalCommentPages, 1)}</strong>
                <span className="ml-3">
                  Showing <strong>{comments.length === 0 ? 0 : startIdx + 1}</strong>–<strong>{Math.min(endIdx, comments.length)}</strong> of <strong>{comments.length}</strong>
                </span>
              </div>
              <button
                onClick={() => setCommentPage((p) => (endIdx >= comments.length ? p : p + 1))}
                disabled={endIdx >= comments.length}
                className={`px-3 py-1 rounded border ${
                  endIdx >= comments.length ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                style={
                  endIdx >= comments.length
                    ? { backgroundColor: '#ffffff', borderColor: ACCENT, color: '#000' }
                    : { backgroundColor: ACCENT, borderColor: ACCENT, color: '#000' }
                }
                aria-label="Next comments page"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
