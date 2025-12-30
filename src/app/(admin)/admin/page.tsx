"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type QuestionType = "single_choice" | "scale_0_10" | "free_text";

type Question = {
	id: string;
	code: string;
	prompt: string;
	question_type: QuestionType;
	options?: { labels?: string[] } | null;
	is_active?: boolean;
};

type AnswerApiRow = {
	id: string;
	value_text: string | null;
	value_number: number | null;
	created_at: string;
	response?: {
		id: string;
		customer_name: string | null;
		customer_email: string | null;
		location: "brickell" | "wynwood";
		created_at: string;
		sentiment_score: number | null;
		nps_bucket: string | null;
	} | null;
	question?: Question | null;
};

type TimeframeOption = "" | "1d" | "7d" | "30d" | "90d" | "custom";
type LocationFilter = "all" | "brickell" | "wynwood";

type StatsTimeframeOption = "1d" | "7d" | "30d" | "90d";
type InsightsTimeframeOption = "7d" | "30d" | "90d";

type StatsResponse = {
	byLocation: Record<string, number>;
	byDay: Record<string, number>;
	nps: { promoters: number; passives: number; detractors: number; missing: number };
	npsScore: number | null;
	sentiment: { negative: number; neutral: number; positive: number; missing: number };
	total: number;
};

type DistributionSlice = { label: string; count: number; color: string };

function formatDateInput(date: Date) {
	return date.toISOString().slice(0, 10);
}

function computeRange(timeframe: TimeframeOption, customFrom: string, customTo: string) {
	if (timeframe === "custom") {
		return {
			from: customFrom ? new Date(customFrom).toISOString() : undefined,
			to: customTo ? new Date(customTo).toISOString() : undefined,
		};
	}

	const effective = timeframe === "" ? "7d" : timeframe;
	const now = new Date();
	const days = effective === "1d" ? 1 : effective === "7d" ? 7 : effective === "30d" ? 30 : 90;
	const fromDate = new Date(now);
	fromDate.setDate(now.getDate() - (days - 1));

	return { from: fromDate.toISOString(), to: now.toISOString() };
}

function computeStatsRange(timeframe: StatsTimeframeOption) {
	const now = new Date();
	const days = timeframe === "1d" ? 1 : timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
	const fromDate = new Date(now);
	fromDate.setDate(now.getDate() - (days - 1));
	return { from: fromDate.toISOString(), to: now.toISOString() };
}

function computeInsightsRange(timeframe: InsightsTimeframeOption) {
	const now = new Date();
	const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
	const fromDate = new Date(now);
	fromDate.setDate(now.getDate() - (days - 1));
	return { from: fromDate.toISOString(), to: now.toISOString() };
}

function formatQuestionCode(code?: string | null) {
	if (!code) return "";
	return code
		.replace(/_/g, " ")
		.toLowerCase()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildDistribution(question: Question | null, answers: AnswerApiRow[]): DistributionSlice[] {
	if (!question) return [];
	const palette = [
		"#ec4899",
		"#8b5cf6",
		"#06b6d4",
		"#22c55e",
		"#f59e0b",
		"#ef4444",
		"#0ea5e9",
		"#10b981",
		"#f97316",
		"#a855f7",
		"#6366f1",
	];

	if (question.question_type === "free_text") {
		const count = answers.filter((a) => (a.value_text || "").trim() !== "").length;
		return [{ label: "Text responses", count, color: palette[0] }];
	}

	if (question.question_type === "single_choice") {
		const labels = question.options?.labels || [];
		const buckets = labels.map(() => 0);
		answers.forEach((row) => {
			const idx = (row.value_number ?? 0) - 1;
			if (idx >= 0 && idx < buckets.length) buckets[idx] += 1;
		});
		return buckets.map((count, idx) => ({ label: labels[idx] || `Option ${idx + 1}`, count, color: palette[idx % palette.length] }));
	}

	// scale_0_10
	const buckets = Array.from({ length: 11 }, () => 0);
	answers.forEach((row) => {
		const val = row.value_number;
		if (val !== null && val >= 0 && val <= 10) {
			buckets[val] += 1;
		}
	});
	return buckets.map((count, idx) => ({ label: idx.toString(), count, color: palette[idx % palette.length] }));
}

export default function AdminHomePage() {
	const [questions, setQuestions] = useState<Question[]>([]);
	const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
	const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
	const [statsTimeframe, setStatsTimeframe] = useState<StatsTimeframeOption>("30d");
	const [insightsTimeframe, setInsightsTimeframe] = useState<InsightsTimeframeOption>("30d");
	const [location, setLocation] = useState<LocationFilter>("all");
	const [insightsLocation, setInsightsLocation] = useState<LocationFilter>("all");
	const [customFrom, setCustomFrom] = useState("");
	const [customTo, setCustomTo] = useState("");
	const [answers, setAnswers] = useState<AnswerApiRow[]>([]);
	const [distribution, setDistribution] = useState<DistributionSlice[]>([]);
	const [loadingQuestions, setLoadingQuestions] = useState(false);
	const [loadingDist, setLoadingDist] = useState(false);
	const [loadingStats, setLoadingStats] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statsError, setStatsError] = useState<string | null>(null);
	const [insights, setInsights] = useState<any>(null);
	const [loadingInsights, setLoadingInsights] = useState(false);
	const [insightsError, setInsightsError] = useState<string | null>(null);
	const [insightsButtonClicked, setInsightsButtonClicked] = useState(false);
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [monthCursor, setMonthCursor] = useState(() => new Date());
	const [hoverDay, setHoverDay] = useState<Date | null>(null);
	const calendarRef = useRef<HTMLDivElement | null>(null);
	const calendarButtonRef = useRef<HTMLButtonElement | null>(null);

	const selectedQuestion = useMemo(
		() => questions.find((q) => q.id === selectedQuestionId) ?? null,
		[questions, selectedQuestionId],
	);

	const isFreeText = selectedQuestion?.question_type === "free_text";
	const isScale = selectedQuestion?.question_type === "scale_0_10";
	const isPie = !!selectedQuestion && !isFreeText && !isScale;

	const range = useMemo(
		() => computeRange(timeframe, customFrom, customTo),
		[timeframe, customFrom, customTo],
	);

	const statsRange = useMemo(() => computeStatsRange(statsTimeframe), [statsTimeframe]);
	const insightsRange = useMemo(() => computeInsightsRange(insightsTimeframe), [insightsTimeframe]);
	const showInsightsTrigger = !insights && !insightsButtonClicked;

	const loadInsights = useCallback(async () => {
		try {
			setLoadingInsights(true);
			setInsightsError(null);
			const params = new URLSearchParams();
			if (insightsRange.from) params.set("from", insightsRange.from);
			if (insightsRange.to) params.set("to", insightsRange.to);
			if (insightsLocation !== "all") params.set("location", insightsLocation);
			const res = await fetch(`/api/admin/insights?${params.toString()}`, { cache: "no-store" });
			const json = await res.json();
			if (!res.ok) throw new Error(json?.error || "Failed to load insights");
			setInsights(json?.insights || null);
		} catch (err: any) {
			console.error(err);
			setInsightsError(err?.message || "Failed to load insights");
			setInsights(null);
		} finally {
			setLoadingInsights(false);
		}
	}, [insightsRange.from, insightsRange.to, insightsLocation]);

	const handleManualInsights = useCallback(() => {
		setInsightsButtonClicked(true);
	}, []);

	useEffect(() => {
		if (!insightsButtonClicked) return;
		loadInsights();
	}, [loadInsights, insightsButtonClicked]);

	const today = useMemo(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}, []);

	const monthDays = useMemo(() => {
		const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
		const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
		const startDay = start.getDay();
		const days: Array<Date | null> = [];
		for (let i = 0; i < startDay; i += 1) days.push(null);
		for (let i = 1; i <= end.getDate(); i += 1) days.push(new Date(start.getFullYear(), start.getMonth(), i));
		return days;
	}, [monthCursor]);

	const canGoNextMonth = useMemo(() => {
		const nextMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
		return nextMonth <= today;
	}, [monthCursor, today]);

	const loadQuestions = useCallback(async () => {
		try {
			setLoadingQuestions(true);
			setError(null);
			const res = await fetch("/api/admin/questions", { cache: "no-store" });
			const json = await res.json();
			if (!res.ok) {
				throw new Error(json?.error || "Failed to load questions");
			}
			const list: Question[] = Array.isArray(json?.questions) ? json.questions : [];
			const active = list.filter((q) => q.is_active !== false);
			setQuestions(active);
			if (!selectedQuestionId && active.length > 0) {
				setSelectedQuestionId(active[0].id);
			}
		} catch (err: any) {
			console.error(err);
			setError(err?.message || "Failed to load questions");
		} finally {
			setLoadingQuestions(false);
		}
	}, [selectedQuestionId]);

	const loadDistribution = useCallback(async () => {
		if (!selectedQuestionId) return;
		try {
			setLoadingDist(true);
			setError(null);
			const params = new URLSearchParams({ questionId: selectedQuestionId, limit: "2000" });
			if (location !== "all") params.set("location", location);
			if (range.from) params.set("from", range.from);
			if (range.to) params.set("to", range.to);
			const res = await fetch(`/api/admin/answers?${params.toString()}`, { cache: "no-store" });
			const json = await res.json();
			if (!res.ok) {
				throw new Error(json?.error || "Failed to load answers");
			}
			const rows: AnswerApiRow[] = Array.isArray(json?.answers) ? json.answers : [];
			setAnswers(rows);
			setDistribution(buildDistribution(selectedQuestion, rows));
		} catch (err: any) {
			console.error(err);
			setError(err?.message || "Failed to load answers");
			setDistribution([]);
		} finally {
			setLoadingDist(false);
		}
	}, [selectedQuestionId, location, range.from, range.to, selectedQuestion]);

	const [stats, setStats] = useState<StatsResponse | null>(null);

	const npsBase = useMemo(() => {
		if (!stats) return 0;
		return stats.nps.promoters + stats.nps.passives + stats.nps.detractors;
	}, [stats]);

	const pct = (value: number) => {
		if (!npsBase) return null;
		return Math.round((value / npsBase) * 100);
	};

	const npsBarWidth = useMemo(() => {
		if (!stats || stats.npsScore === null || stats.npsScore === undefined) return "0%";
		const normalized = (stats.npsScore + 100) / 200;
		const clamped = Math.min(1, Math.max(0, normalized));
		return `${Math.round(clamped * 100)}%`;
	}, [stats]);

	const npsLabel = useMemo(() => {
		if (!stats || stats.npsScore === null || stats.npsScore === undefined) return "—";
		const rounded = Math.round(stats.npsScore);
		return `${rounded > 0 ? "+" : ""}${rounded}`;
	}, [stats]);

	const loadStats = useCallback(async () => {
		try {
			setLoadingStats(true);
			setStatsError(null);
			const params = new URLSearchParams();
			params.set("from", statsRange.from);
			params.set("to", statsRange.to);
			if (location !== "all") params.set("location", location);
			const res = await fetch(`/api/admin/stats?${params.toString()}`, { cache: "no-store" });
			const json = await res.json();
			if (!res.ok) {
				throw new Error(json?.error || "Failed to load stats");
			}
			setStats(json as StatsResponse);
		} catch (err: any) {
			console.error(err);
			setStatsError(err?.message || "Failed to load stats");
			setStats(null);
		} finally {
			setLoadingStats(false);
		}
	}, [statsRange.from, statsRange.to, location]);

	useEffect(() => {
		loadQuestions();
	}, [loadQuestions]);

	useEffect(() => {
		loadDistribution();
	}, [loadDistribution]);

	useEffect(() => {
		loadStats();
	}, [loadStats]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			const target = event.target as Node;
			if (
				calendarOpen &&
				calendarRef.current &&
				!calendarRef.current.contains(target) &&
				calendarButtonRef.current &&
				!calendarButtonRef.current.contains(target)
			) {
				setCalendarOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [calendarOpen]);

	useEffect(() => {
		if (!calendarOpen) setHoverDay(null);
	}, [calendarOpen]);

	const totalAnswers = useMemo(() => distribution.reduce((sum, slice) => sum + slice.count, 0), [distribution]);

	const commentAnswers = useMemo(() => {
		if (!isFreeText) return [];
		return answers.filter((a) => {
			if ((a.value_text || "").trim() === "") return false;
			const ts = new Date(a.created_at).getTime();
			const fromOk = !range.from || ts >= new Date(range.from).getTime();
			const toOk = !range.to || ts <= new Date(range.to).getTime();
			return fromOk && toOk;
		});
	}, [answers, isFreeText, range.from, range.to]);

	const pieStyle = useMemo(() => {
		if (totalAnswers === 0) return { backgroundImage: "conic-gradient(#e5e5e5 0deg 360deg)" };
		let acc = 0;
		const segments: string[] = [];
		distribution.forEach((slice) => {
			const start = (acc / totalAnswers) * 360;
			acc += slice.count;
			const end = (acc / totalAnswers) * 360;
			segments.push(`${slice.color} ${start}deg ${end}deg`);
		});
		return { backgroundImage: `conic-gradient(${segments.join(", ")})` };
	}, [distribution, totalAnswers]);

	const scaleAverage = useMemo(() => {
		if (!isScale || distribution.length === 0) return null;
		let total = 0;
		let count = 0;
		distribution.forEach((slice) => {
			const val = Number(slice.label);
			if (!Number.isNaN(val)) {
				total += val * slice.count;
				count += slice.count;
			}
		});
		if (count === 0) return null;
		return total / count;
	}, [distribution, isScale]);

	const scaleGaugeStyle = useMemo(() => {
		if (!isScale || scaleAverage === null) return { backgroundImage: "conic-gradient(#e5e7eb 0deg 360deg)" };
		const pct = Math.max(0, Math.min(100, (scaleAverage / 10) * 100));
		const deg = (pct / 100) * 360;
		return { backgroundImage: `conic-gradient(#ec4899 0deg ${deg}deg, #e5e7eb ${deg}deg 360deg)` };
	}, [isScale, scaleAverage]);

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Overview</p>
				<h1 className="text-2xl font-semibold text-neutral-900">Dashboard</h1>
				<p className="text-sm text-neutral-600">Monitor NPS, AI notes, and question distributions.</p>
			</header>

			<section className="grid gap-4 md:grid-cols-2">
				<div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-[#EB5A95]/10 to-white p-5 shadow-sm">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-[11px] uppercase tracking-[0.14em] text-[#EB5A95]">General NPS</p>
							<h2 className="text-xl font-semibold text-[#EB5A95]">Overall split</h2>
							<p className="text-xs text-neutral-600">Promoters, passives, and detractors for the window.</p>
						</div>
						<div className="relative">
							<select
								value={statsTimeframe}
								onChange={(e) => setStatsTimeframe(e.target.value as StatsTimeframeOption)}
								className="h-9 appearance-none rounded-full border border-[#EB5A95]/30 bg-white px-3 pr-8 text-xs font-regular text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/40"
							>
								<option value="1d">Last day</option>
								<option value="7d">Last week</option>
								<option value="30d">Last month</option>
								<option value="90d">Last 90 days</option>
							</select>
							<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#EB5A95]">▾</span>
						</div>
					</div>
					<div className="mt-4 grid grid-cols-3 gap-3 text-center">
						<div className="rounded-xl border border-green-100 bg-green-50 px-3 py-4">
							<p className="text-xs font-semibold text-green-700">Promoters</p>
							<p className="text-2xl font-bold text-green-700">
								{loadingStats ? "…" : (() => { const val = pct(stats?.nps.promoters || 0); return val === null ? "—" : `${val}%`; })()}
							</p>
							<p className="text-[11px] text-green-600">
								{stats ? `${stats.nps.promoters} responses` : loadingStats ? "Loading" : "No data"}
							</p>
						</div>
						<div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-4">
							<p className="text-xs font-semibold text-amber-700">Passives</p>
							<p className="text-2xl font-bold text-amber-700">
								{loadingStats ? "…" : (() => { const val = pct(stats?.nps.passives || 0); return val === null ? "—" : `${val}%`; })()}
							</p>
							<p className="text-[11px] text-amber-700">
								{stats ? `${stats.nps.passives} responses` : loadingStats ? "Loading" : "No data"}
							</p>
						</div>
						<div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-4">
							<p className="text-xs font-semibold text-rose-700">Detractors</p>
							<p className="text-2xl font-bold text-rose-700">
								{loadingStats ? "…" : (() => { const val = pct(stats?.nps.detractors || 0); return val === null ? "—" : `${val}%`; })()}
							</p>
							<p className="text-[11px] text-rose-700">
								{stats ? `${stats.nps.detractors} responses` : loadingStats ? "Loading" : "No data"}
							</p>
						</div>
					</div>
					<div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-sm font-semibold text-neutral-800">NPS</p>
								<p className="text-[11px] text-neutral-500">{npsBase ? `${npsBase} scored responses` : loadingStats ? "Loading" : "No scored responses"}</p>
							</div>
							<p className="text-xl font-bold text-neutral-900">{npsLabel}</p>
						</div>
						<div className="mt-3 flex items-center gap-3">
							<div className="flex-1 rounded-full bg-neutral-200 p-1">
								<div
									className="h-2 rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500"
									style={{ width: npsBarWidth }}
								></div>
							</div>
							<span className="text-xs text-neutral-500">-100</span>
							<span className="text-xs text-neutral-500">0</span>
							<span className="text-xs text-neutral-500">100</span>
						</div>
						{statsError && <p className="mt-2 text-xs text-rose-600">{statsError}</p>}
					</div>
				</div>

				<div className="relative rounded-2xl border border-pink-100 bg-gradient-to-br from-white to-[#EB5A95]/10 p-5 shadow-sm">
					<div className="flex flex-wrap items-start justify-between gap-3">
						<div>
							<p className="text-[11px] uppercase tracking-[0.14em] text-[#EB5A95]">AI insights</p>
							<h2 className="text-xl font-semibold text-[#EB5A95]">Patterns & highlights</h2>
							<p className="text-xs text-neutral-600">Summaries for the selected window.</p>
						</div>
						<div className="flex flex-nowrap items-center gap-2 text-xs whitespace-nowrap">
							<select
								value={insightsTimeframe}
								onChange={(e) => setInsightsTimeframe(e.target.value as InsightsTimeframeOption)}
								className="h-9 appearance-none rounded-full border border-[#EB5A95]/30 bg-white px-3 pr-8 text-xs font-regular text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/40"
							>
								<option value="7d">Last week</option>
								<option value="30d">Last month</option>
								<option value="90d">Last 90 days</option>
							</select>
							<span className="pointer-events-none -ml-6 text-[#EB5A95]">▾</span>
							<select
								value={insightsLocation}
								onChange={(e) => setInsightsLocation(e.target.value as LocationFilter)}
								className="h-9 appearance-none rounded-full border border-[#EB5A95]/30 bg-white px-3 pr-8 text-xs font-regular text-neutral-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#EB5A95]/40"
							>
								<option value="all">All locations</option>
								<option value="brickell">Brickell</option>
								<option value="wynwood">Wynwood</option>
							</select>
							<span className="pointer-events-none -ml-6 text-[#EB5A95]">▾</span>
						</div>
					</div>
					{showInsightsTrigger && (
						<div className="mt-4 flex w-full justify-center">
							<button
								onClick={handleManualInsights}
								disabled={loadingInsights}
								className="inline-flex h-10 items-center rounded-full bg-[#EB5A95] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#d94483] disabled:opacity-60"
							>
								{loadingInsights ? "Loading…" : "Trigger AI insights"}
							</button>
						</div>
					)}
					<div className="mt-3 space-y-3 text-sm text-neutral-800 max-h-[380px] overflow-y-auto pr-1">
						{insightsError && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">{insightsError}</div>}
						{!insightsError && insights && (
							<>
								{insights?.patterns?.manager_summary?.short_summary && (
									<div className="rounded-lg border border-pink-100 bg-[#EB5A95]/10 px-3 py-2 text-[#EB5A95]">
										{insights.patterns.manager_summary.short_summary}
									</div>
								)}
								<div className="space-y-3">
									<p className="text-sm font-semibold text-neutral-700">Themes & actions</p>
									<div className="space-y-3 divide-y divide-neutral-200">
										{(insights?.patterns?.top_themes ?? []).slice(0, 5).map((t: any, idx: number) => {
											const action = (insights?.patterns?.recommended_actions ?? [])[idx] || null;
											return (
												<div key={t.theme} className="space-y-1 py-3 first:pt-0 last:pb-0">
													<div className="flex items-center gap-2 text-xs font-semibold text-[#EB5A95]">
														<span className="rounded-full bg-[#EB5A95]/10 px-2 py-[2px] text-[11px] font-regular text-[#EB5A95]">Theme</span>
														<span className="text-sm font-regular text-neutral-900">{t.theme}</span>
														<span className="text-[11px] text-neutral-500">{t.count} mentions</span>
													</div>
													<div className="flex items-start gap-2 text-neutral-800">
														<span className="rounded-full bg-emerald-50 px-2 py-[2px] text-[11px] font-regular text-emerald-700">Action</span>
														<div className="space-y-1 text-xs">
															<p className="font-regular text-neutral-600 text-sm">{action?.action || "(No action returned by AI)"}</p>
															{action?.owner && <p className="text-[11px] text-neutral-500">Owner: {action.owner}</p>}
														</div>
													</div>
												</div>
											);
										})}
									</div>
								</div>
							</>
						)}
					</div>
					{loadingInsights && (
						<div className="absolute inset-0 rounded-2xl bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
							<div className="h-10 w-10 animate-spin rounded-full border-2 border-[#EB5A95]/30 border-t-[#EB5A95]"></div>
						</div>
					)}
				</div>
			</section>

			<section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3 md:flex-nowrap">
					<div className="flex min-w-0 flex-wrap items-center gap-3 flex-1">
						<div className="text-[10px] font-light uppercase tracking-[0.1em] text-neutral-500">Filter by date</div>
						<div className="relative">
							<select
								className="h-10 appearance-none rounded-full border border-neutral-200 bg-white/90 px-3 pr-8 text-xs font-regular text-neutral-800 shadow-sm ring-1 ring-transparent transition hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
								value={timeframe}
								onChange={(e) => setTimeframe(e.target.value as TimeframeOption)}
							>
								<option value="" disabled>
									Select option
								</option>
								<option value="1d">Last day</option>
								<option value="7d">Last week</option>
								<option value="30d">Last month</option>
								<option value="90d">Last 90 days</option>
								<option value="custom">Custom</option>
							</select>
							<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">▾</span>
						</div>
						<div className="relative">
							<button
								type="button"
								onClick={() => {
									setCalendarOpen((v) => !v);
									setHoverDay(null);
								}}
								ref={calendarButtonRef}
								className="flex h-10 items-center justify-between gap-3 rounded-full border border-neutral-200 bg-white px-3 text-xs font-regular text-neutral-800 shadow-sm transition hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
							>
								<span>
									{customFrom && customTo ? `${customFrom} → ${customTo}` : customFrom ? `${customFrom} → …` : "Timeframe"}
								</span>
								<span className="text-xs text-neutral-500">▾</span>
							</button>
							{calendarOpen && (
								<div ref={calendarRef} className="absolute left-0 top-full z-40 mt-2 w-[360px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl">
									<div className="flex items-center justify-between text-sm font-semibold text-pink-600">
										<button
											type="button"
											onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
											className="rounded-full border border-neutral-200 px-2 py-1 text-xs text-neutral-700 hover:border-neutral-300"
										>
											▴
										</button>
										<div>
											{monthCursor.toLocaleString("default", { month: "long" })} {monthCursor.getFullYear()}
										</div>
										<button
											type="button"
											disabled={!canGoNextMonth}
											onClick={() => setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
											className="rounded-full border border-neutral-200 px-2 py-1 text-xs text-neutral-700 hover:border-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
										>
											▾
										</button>
									</div>
									<div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
										{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
											<div key={d}>{d}</div>
										))}
									</div>
									<div className="mt-2 grid grid-cols-7 gap-1 text-center text-sm">
										{monthDays.map((day, idx) => {
											if (!day) return <div key={idx} />;

											const dayValue = day.getTime();
											const disabled = dayValue > today.getTime();
											const start = customFrom ? new Date(customFrom).getTime() : null;
											const end = customTo ? new Date(customTo).getTime() : null;
											const hoverValue = hoverDay ? hoverDay.getTime() : null;
											const isStart = start !== null && dayValue === start;
											const isEnd = end !== null && dayValue === end;
											const inRangeActual = start !== null && end !== null && dayValue > start && dayValue < end;
											const inRangePreview =
												start !== null &&
												end === null &&
												hoverValue !== null &&
												((dayValue > Math.min(start, hoverValue) && dayValue < Math.max(start, hoverValue)));
											const isPreviewEnd = start !== null && end === null && hoverValue !== null && dayValue === hoverValue;

											const bg = disabled
												? "bg-neutral-200 text-neutral-500"
												: isStart || isEnd
													? "bg-pink-500 text-white"
												: isPreviewEnd
													? "bg-pink-200 text-pink-800"
												: inRangeActual || inRangePreview
													? "bg-pink-100 text-pink-700"
													: "bg-white text-neutral-800";

											return (
												<button
													key={dayValue}
													type="button"
													disabled={disabled}
													onClick={() => {
														if (disabled) return;
														setTimeframe("custom");
														const startDate = customFrom ? new Date(customFrom) : null;
														const endDate = customTo ? new Date(customTo) : null;

														if (!startDate || (startDate && endDate)) {
															setCustomFrom(formatDateInput(day));
															setCustomTo("");
															setHoverDay(null);
														} else if (startDate && !endDate) {
															if (dayValue < startDate.getTime()) {
																setCustomFrom(formatDateInput(day));
															} else {
																setCustomTo(formatDateInput(day));
																setCalendarOpen(false);
																setHoverDay(null);
															}
														}
												}}
												onMouseEnter={() => {
													if (!disabled && start !== null && end === null) {
														setHoverDay(day);
													}
											}}
												onMouseLeave={() => {
													if (!disabled) setHoverDay(null);
											}}
												className={`flex h-10 w-10 items-center justify-center rounded-full ${bg} transition hover:border hover:border-pink-200 disabled:cursor-not-allowed`}
											>
												{day.getDate()}
											</button>
										);
									})}
								</div>
							</div>
						)}
					</div>
					<div className="flex items-center gap-2 md:ml-auto shrink-0">
						<div className="text-[10px] font-regular uppercase tracking-[0.14em] text-neutral-500">Location</div>
						<div className="relative">
							<select
								className="h-10 appearance-none rounded-full border border-neutral-200 bg-white/90 px-3 pr-8 text-xs font-regular text-neutral-800 shadow-sm ring-1 ring-transparent transition hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
								value={location}
								onChange={(e) => setLocation(e.target.value as LocationFilter)}
							>
								<option value="all">All locations</option>
								<option value="brickell">Brickell</option>
								<option value="wynwood">Wynwood</option>
							</select>
							<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">▾</span>
						</div>
					</div>
				</div>
				</div>

				{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

				<div className="mt-6 grid gap-5 lg:grid-cols-3">
					<div className="lg:col-span-2 overflow-hidden rounded-xl border border-neutral-200">
						<table className="min-w-full divide-y divide-neutral-200 text-sm">
							<thead className="bg-neutral-50 text-neutral-600">
								<tr>
									<th className="px-4 py-2 text-left font-semibold">Question</th>
									<th className="px-4 py-2 text-left font-semibold">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-neutral-200 bg-white text-neutral-800">
								{!loadingQuestions && questions.length === 0 && (
									<tr>
										<td className="px-4 py-3 text-sm text-neutral-500" colSpan={2}>
											No active questions found.
										</td>
									</tr>
								)}
								{questions.map((q) => {
									const active = q.id === selectedQuestionId;
									return (
										<tr
											key={q.id}
											onClick={() => setSelectedQuestionId(q.id)}
											className={`cursor-pointer transition ${active ? "bg-pink-50" : "hover:bg-neutral-50"}`}
										>
											<td className="px-4 py-3">
												<p className="text-sm font-medium text-neutral-900">{q.prompt}</p>
												<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] uppercase text-neutral-500">
													<span className="rounded-full border border-pink-200 bg-pink-50 px-2 py-[2px] text-[10px] font-semibold text-pink-700 tracking-normal">
														{formatQuestionCode(q.code)}
													</span>
												</div>
											</td>
											<td className="px-4 py-3 text-sm font-semibold text-pink-600">Active</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					<div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold text-neutral-800">
									{isFreeText ? "Comments" : isScale ? "Score distribution" : "Answer distribution"}
								</p>
								<p className="text-xs text-neutral-500">
									{isFreeText ? "Showing submitted text answers" : isScale ? "Scores with filters applied" : "Pie updates with filters and selection."}
								</p>
							</div>
							<div className="text-xs text-neutral-500">{isFreeText ? commentAnswers.length : totalAnswers} responses</div>
						</div>

						{isFreeText && (
							<div className="mt-4 space-y-3 max-h-96 overflow-y-auto pr-1">
								{loadingDist && <p className="text-sm text-neutral-600">Loading…</p>}
								{!loadingDist && commentAnswers.length === 0 && <p className="text-sm text-neutral-600">No comments in this window.</p>}
								{commentAnswers.map((a) => (
										<div key={a.id} className="relative rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 pt-5">
										{a.response?.location && (
											<span className="absolute right-3 top-2 rounded-full bg-pink-100 px-2 py-[1px] text-[9px] font-semibold uppercase tracking-[0.12em] text-pink-700">
												{a.response.location}
											</span>
										)}
										<p className="text-sm text-neutral-900 pr-12">{a.value_text}</p>
										<div className="mt-2 flex items-center justify-between text-[11px] tracking-[0.08em] text-neutral-500">
											<div className="flex items-center gap-3">
												{a.response?.customer_name && <span className="capitalize tracking-normal">{a.response.customer_name.toLowerCase()}</span>}
											</div>
											<span className="uppercase">{new Date(a.created_at).toLocaleDateString()}</span>
										</div>
									</div>
								))}
							</div>
						)}

						{isScale && (
							<div className="mt-4 flex min-h-[320px] flex-col items-center justify-center gap-5">
								<div
									className="flex h-48 w-48 items-center justify-center rounded-full bg-neutral-100"
									style={scaleGaugeStyle}
								>
									<div className="flex h-28 w-28 items-center justify-center rounded-full bg-white text-2xl font-semibold text-neutral-900 shadow-inner">
										{scaleAverage === null ? "—" : scaleAverage.toFixed(1)}
									</div>
								</div>
								<p className="text-xs text-neutral-500">Average score (0-10)</p>
							</div>
						)}

						{isPie && (
							<div className="mt-4 flex flex-col items-center justify-center gap-4">
								<div
									className="flex h-56 w-56 items-center justify-center rounded-full bg-neutral-100"
									style={pieStyle}
								>
									<div className="h-32 w-32 rounded-full bg-white shadow-inner flex items-center justify-center text-sm font-semibold text-neutral-800">
										{loadingDist ? "Loading" : totalAnswers === 0 ? "No data" : ""}
									</div>
								</div>
								<div className="w-full space-y-2">
									{distribution.map((slice) => {
										const pct = totalAnswers ? Math.round((slice.count / totalAnswers) * 100) : 0;
										return (
											<div key={slice.label} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2">
												<div className="flex items-center gap-2">
													<span className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }}></span>
													<span className="text-sm font-medium text-neutral-800">{slice.label}</span>
												</div>
												<div className="text-sm text-neutral-700">
													{slice.count} · {pct}%
												</div>
											</div>
										);
									})}
									{!loadingDist && distribution.length === 0 && (
										<p className="text-sm text-neutral-600">No responses in this window.</p>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</section>
		</div>
	);
}

