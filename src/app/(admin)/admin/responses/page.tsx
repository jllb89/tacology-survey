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
type RowSelection = Record<string, boolean>;

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

function formatAnswer(row: AnswerApiRow, question: Question | null) {
	if (!question) {
		return row.value_text || (row.value_number !== null ? row.value_number.toString() : "");
	}

	if (question.question_type === "single_choice") {
		// Prefer stored text; fall back to label lookup by index if provided
		if (row.value_text) return row.value_text;
		const labels = question.options?.labels || [];
		const idx = (row.value_number ?? 0) - 1;
		return labels[idx] || (row.value_number !== null ? row.value_number.toString() : "");
	}

	if (question.question_type === "scale_0_10") {
		return row.value_number !== null ? row.value_number.toString() : "";
	}

	return row.value_text || "";
}

export default function AdminResponsesPage() {
	const [questions, setQuestions] = useState<Question[]>([]);
	const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
	const [answers, setAnswers] = useState<AnswerApiRow[]>([]);
	const [timeframe, setTimeframe] = useState<TimeframeOption>("7d");
	const [location, setLocation] = useState<LocationFilter>("all");
	const [customFrom, setCustomFrom] = useState("");
	const [customTo, setCustomTo] = useState("");
	const [loadingQuestions, setLoadingQuestions] = useState(false);
	const [loadingAnswers, setLoadingAnswers] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(25);
	const [total, setTotal] = useState(0);
	const [selectedRows, setSelectedRows] = useState<RowSelection>({});
	// ✅ Make client defaults match the desired server behavior (newest first)
	const [sortBy, setSortBy] = useState<"answer" | "date">("date");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const [answerFilter, setAnswerFilter] = useState<string | number | null>(null);
	const [questionOpen, setQuestionOpen] = useState(false);
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [monthCursor, setMonthCursor] = useState(() => new Date());
	const [hoverDay, setHoverDay] = useState<Date | null>(null);
	const calendarRef = useRef<HTMLDivElement | null>(null);
	const calendarButtonRef = useRef<HTMLButtonElement | null>(null);

	const selectedQuestion = useMemo(
		() => questions.find((q) => q.id === selectedQuestionId) ?? null,
		[questions, selectedQuestionId],
	);

	const range = useMemo(() => computeRange(timeframe, customFrom, customTo), [timeframe, customFrom, customTo]);

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
			setQuestions(list);
			if (!selectedQuestionId && list.length > 0) {
				const firstActive = list.find((q) => q.is_active !== false) || list[0];
				setSelectedQuestionId(firstActive.id);
			}
		} catch (err: any) {
			console.error(err);
			setError(err?.message || "Failed to load questions");
		} finally {
			setLoadingQuestions(false);
		}
	}, [selectedQuestionId]);

	const loadAnswers = useCallback(async () => {
		if (!selectedQuestionId) return;
		try {
			setLoadingAnswers(true);
			setError(null);

			const params = new URLSearchParams({
				questionId: selectedQuestionId,
				page: String(page),
				pageSize: String(pageSize),
				// ✅ Always send explicit sort (now matches UI state)
				sortBy,
				sortDir,
			});

			if (location !== "all") {
				params.set("location", location);
			}
			if (range.from) params.set("from", range.from);
			if (range.to) params.set("to", range.to);
			if (selectedQuestion && answerFilter !== null) {
				if (selectedQuestion.question_type === "single_choice") {
					params.set("answer", String(answerFilter));
				} else if (selectedQuestion.question_type === "scale_0_10") {
					params.set("answerNumber", String(answerFilter));
				}
			}

			const res = await fetch(`/api/admin/answers?${params.toString()}`, { cache: "no-store" });
			const json = await res.json();
			if (!res.ok) {
				throw new Error(json?.error || "Failed to load answers");
			}
			setAnswers(Array.isArray(json?.answers) ? json.answers : []);
			setTotal(typeof json?.total === "number" ? json.total : 0);
			setSelectedRows({});
		} catch (err: any) {
			console.error(err);
			setError(err?.message || "Failed to load answers");
		} finally {
			setLoadingAnswers(false);
		}
	}, [selectedQuestionId, selectedQuestion?.question_type, location, range.from, range.to, page, pageSize, sortBy, sortDir, answerFilter]);

	useEffect(() => {
		loadQuestions();
	}, [loadQuestions]);

	useEffect(() => {
		setPage(1);
	}, [selectedQuestionId, location, timeframe, customFrom, customTo, pageSize, sortBy, sortDir, answerFilter]);

	useEffect(() => {
		loadAnswers();
	}, [loadAnswers]);

	useEffect(() => {
		setAnswerFilter(null);
	}, [selectedQuestionId]);

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
		if (!calendarOpen) {
			setHoverDay(null);
		}
	}, [calendarOpen]);

	const locationLabel = (loc: string | undefined) => {
		if (loc === "brickell") return "Brickell";
		if (loc === "wynwood") return "Wynwood";
		return "—";
	};

	const handleSort = (column: "answer" | "date") => {
		if (sortBy === column) {
			setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(column);
			// ✅ default direction when switching columns (keep consistent)
			setSortDir(column === "date" ? "desc" : "asc");
		}
	};

	const formatQuestionCode = useCallback((code?: string | null) => {
		if (!code) return "";
		return code
			.replace(/_/g, " ")
			.toLowerCase()
			.replace(/\b\w/g, (c) => c.toUpperCase());
	}, []);

	const today = useMemo(() => {
		const d = new Date();
		d.setHours(0, 0, 0, 0);
		return d;
	}, []);

	const answerFilterPills = useMemo(() => {
		if (!selectedQuestion) return [] as Array<{ label: string; value: string | number }>;
		if (selectedQuestion.question_type === "single_choice") {
			const labels = selectedQuestion.options?.labels ?? [];
			return labels.map((label) => ({ label, value: label }));
		}
		if (selectedQuestion.question_type === "scale_0_10") {
			return Array.from({ length: 11 }, (_, idx) => ({ label: String(idx), value: idx }));
		}
		return [] as Array<{ label: string; value: string | number }>;
	}, [selectedQuestion]);

	const monthDays = useMemo(() => {
		const start = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
		const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
		const startDay = start.getDay();
		const days: Array<Date | null> = [];
		for (let i = 0; i < startDay; i += 1) {
			days.push(null);
		}
		for (let i = 1; i <= end.getDate(); i += 1) {
			days.push(new Date(start.getFullYear(), start.getMonth(), i));
		}
		return days;
	}, [monthCursor]);

	const canGoNextMonth = useMemo(() => {
		const nextMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
		return nextMonth <= today;
	}, [monthCursor, today]);

	return (
		<div className="space-y-6">
			<header className="space-y-2">
				<h1 className="text-2xl font-semibold text-neutral-900">Responses Table</h1>
				<p className="text-sm text-neutral-600">Deep-dive into answers.</p>
			</header>

			<section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
				<div className="flex flex-col gap-4">
					<div className="flex flex-wrap items-center gap-3 md:gap-4">
						<div className="relative z-30">
							<button
								type="button"
								onClick={() => setQuestionOpen((v) => !v)}
								disabled={loadingQuestions}
								className="flex h-10 min-w-[260px] items-center justify-between rounded-full border border-neutral-200 bg-white px-4 text-xs font-regular text-neutral-800 shadow-sm ring-1 ring-transparent transition hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
							>
								<span className="truncate">Questions</span>
								<span className="text-xs text-neutral-500">{questionOpen ? "▴" : "▾"}</span>
							</button>
							{questionOpen && (
								<div className="absolute left-0 z-40 mt-2 w-[520px] max-h-80 overflow-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-2xl">
									{loadingQuestions && <div className="px-3 py-2 text-sm text-neutral-600">Loading...</div>}
									{!loadingQuestions && questions.length === 0 && (
										<div className="px-3 py-2 text-sm text-neutral-600">No questions found</div>
									)}
									{questions.map((q) => {
										const active = q.id === selectedQuestionId;
										return (
											<button
												key={q.id}
												type="button"
												onClick={() => {
													setSelectedQuestionId(q.id);
													setQuestionOpen(false);
												}}
												className={`group flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-pink-50 ${
													active ? "bg-pink-50" : ""
												}`}
											>
												<div
													className={`mt-1 flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] font-semibold ${
														active
															? "border-pink-500 bg-pink-500 text-white"
															: "border-neutral-300 bg-white text-transparent"
													}`}
												>
													✓
												</div>
												<div className="flex-1">
													<p className="text-xs uppercase tracking-[0.14em] text-neutral-500">{formatQuestionCode(q.code)}</p>
													<p className="text-sm font-medium text-neutral-900 leading-snug">{q.prompt}</p>
												</div>
											</button>
										);
									})}
								</div>
							)}
						</div>

						<div className="flex items-center gap-2">
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
								<div
									ref={calendarRef}
									className="absolute left-0 top-full z-40 mt-2 w-[360px] rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl"
								>
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
												dayValue > Math.min(start, hoverValue) &&
												dayValue < Math.max(start, hoverValue);
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
														if (!disabled && start !== null && end === null) setHoverDay(day);
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

						<div className="flex items-center gap-2">
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

					<div className="flex flex-wrap items-center gap-3 md:gap-4">
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700 mt-6">
					<span className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Selected question</span>
					<span className="font-semibold text-pink-600">{selectedQuestion?.prompt ?? "No question selected"}</span>
				</div>

				{answerFilterPills.length > 0 && (
					<div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-700">
						<span className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Filter answers</span>
						<button
							type="button"
							onClick={() => setAnswerFilter(null)}
							className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
								answerFilter === null
									? "border-pink-400 bg-pink-50 text-pink-700"
									: "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
							}`}
						>
							All
						</button>
						{answerFilterPills.map((opt) => {
							const active = answerFilter === opt.value;
							return (
								<button
									key={opt.label}
									type="button"
									onClick={() => setAnswerFilter(opt.value)}
									className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
										active
											? "border-pink-400 bg-pink-50 text-pink-700"
											: "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
									}`}
								>
									{opt.label}
								</button>
							);
						})}
					</div>
				)}

				<div className="mt-6 overflow-hidden rounded-xl border border-neutral-200">
					<table className="min-w-full divide-y divide-neutral-200 text-sm">
						<thead className="bg-neutral-50 text-neutral-600">
							<tr>
								<th className="px-4 py-2 text-left font-semibold">
									<button
										type="button"
										onClick={() => {
											const allSelected = answers.length > 0 && answers.every((a) => selectedRows[a.id]);
											if (allSelected) setSelectedRows({});
											else {
												const next: RowSelection = {};
												answers.forEach((row) => (next[row.id] = true));
												setSelectedRows(next);
											}
										}}
										className="flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] font-semibold transition hover:border-pink-400"
										style={{
											backgroundColor:
												answers.length > 0 && answers.every((a) => selectedRows[a.id]) ? "#ec4899" : "white",
											borderColor:
												answers.length > 0 && answers.every((a) => selectedRows[a.id]) ? "#ec4899" : "#d4d4d8",
											color: answers.length > 0 && answers.every((a) => selectedRows[a.id]) ? "white" : "transparent",
										}}
									>
										✓
									</button>
								</th>
								<th className="px-4 py-2 text-left font-semibold">Customer</th>
								<th className="px-4 py-2 text-left font-semibold">Location</th>
								<th className="px-4 py-2 text-left font-semibold">
									<button
										type="button"
										onClick={() => handleSort("answer")}
										className="flex items-center gap-1 text-neutral-700 hover:text-pink-600"
									>
										Answer
										<span className="text-[10px] leading-none text-neutral-400">
											{sortBy === "answer" ? (sortDir === "asc" ? "▲" : "▼") : "▵"}
										</span>
									</button>
								</th>
								<th className="px-4 py-2 text-left font-semibold">
									<button
										type="button"
										onClick={() => handleSort("date")}
										className="flex items-center gap-1 text-neutral-700 hover:text-pink-600"
									>
										Date
										<span className="text-[10px] leading-none text-neutral-400">
											{sortBy === "date" ? (sortDir === "asc" ? "▲" : "▼") : "▵"}
										</span>
									</button>
								</th>
							</tr>
						</thead>

						<tbody className="divide-y divide-neutral-200 bg-white text-neutral-800">
							{loadingAnswers && (
								<tr>
									<td className="px-4 py-3 text-sm text-neutral-500" colSpan={5}>
										Loading latest answers...
									</td>
								</tr>
							)}
							{!loadingAnswers && answers.length === 0 && (
								<tr>
									<td className="px-4 py-3 text-sm text-neutral-500" colSpan={5}>
										No answers found for this filter.
									</td>
								</tr>
							)}
							{!loadingAnswers &&
								answers.map((row) => (
									<tr key={row.id}>
										<td className="px-4 py-3 text-sm text-neutral-800">
											<button
												type="button"
												onClick={() => setSelectedRows((prev) => ({ ...prev, [row.id]: !prev[row.id] }))}
												className="flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] font-semibold transition hover:border-pink-400"
												style={{
													backgroundColor: selectedRows[row.id] ? "#ec4899" : "white",
													borderColor: selectedRows[row.id] ? "#ec4899" : "#d4d4d8",
													color: selectedRows[row.id] ? "white" : "transparent",
												}}
											>
												✓
											</button>
										</td>
										<td className="px-4 py-3 text-sm font-medium text-neutral-900">
											{row.response?.customer_name || row.response?.customer_email || "Guest"}
										</td>
										<td className="px-4 py-3 text-sm text-neutral-600">{locationLabel(row.response?.location)}</td>
										<td className="px-4 py-3 text-sm text-neutral-800">{formatAnswer(row, selectedQuestion)}</td>
										<td className="px-4 py-3 text-sm text-neutral-600">
											{row.response?.created_at?.slice(0, 10) || row.created_at.slice(0, 10)}
										</td>
									</tr>
								))}
						</tbody>
					</table>
				</div>

				<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-700">
					<div>
						Page {page} of {Math.max(1, Math.ceil(total / pageSize))} · {total} total
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<label className="flex items-center gap-2 text-xs text-neutral-600">
							<span className="text-[10px] uppercase tracking-[0.14em] text-neutral-500">Page size</span>
							<div className="relative">
								<select
									className="h-8 appearance-none rounded-full border border-neutral-200 bg-white/90 px-3 pr-8 text-xs font-regular text-neutral-800 shadow-sm ring-1 ring-transparent transition hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
									value={pageSize}
									onChange={(e) => {
										const next = Math.min(200, Math.max(1, Number(e.target.value)));
										setPageSize(next);
									}}
								>
									{[10, 25, 50, 100, 200].map((size) => (
										<option key={size} value={size}>
											{size}
										</option>
									))}
								</select>
								<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500">▾</span>
							</div>
						</label>

						<div className="flex items-center gap-2">
							<button
								disabled={page <= 1 || loadingAnswers}
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
							>
								Prev
							</button>
							<button
								disabled={page * pageSize >= total || loadingAnswers}
								onClick={() => setPage((p) => p + 1)}
								className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
							>
								Next
							</button>
						</div>
					</div>
				</div>

				{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
			</section>
		</div>
	);
}
