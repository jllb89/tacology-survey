import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { jsonrepair } from "jsonrepair";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { OPENAI_API_KEY, requireEnv } from "@/lib/config";

const client = new OpenAI({ apiKey: requireEnv(OPENAI_API_KEY, "OPENAI_API_KEY") });

const querySchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
	location: z.enum(["brickell", "wynwood"]).optional(),
	limit: z.coerce.number().int().min(50).max(800).optional(),
});

function loadPrompt(): string {
	const promptPath = path.join(process.cwd(), "docs", "ai_insights_prompt.md");
	return fs.readFileSync(promptPath, "utf8");
}

type AnswerRow = {
	value_text: string | null;
	value_number: number | null;
	question: {
		code: string | null;
		prompt: string | null;
		question_type: string | null;
		options: any;
	} | null;
};

type ResponseRow = {
	id: string;
	location: "brickell" | "wynwood" | null;
	created_at: string;
	nps_bucket: string | null;
	sentiment_score: number | null;
	answers: AnswerRow[] | null;
};

function extractNps(answerRows: AnswerRow[]): number | null {
	for (const a of answerRows) {
		if (typeof a?.value_number === "number" && a.value_number >= 0 && a.value_number <= 10) {
			return a.value_number;
		}
	}
	return null;
}

function buildPayload(rows: ResponseRow[], from?: string | null, to?: string | null, limit = 400) {
	const responses = rows.slice(0, limit).map((row) => {
		const answers = Array.isArray(row.answers) ? row.answers : [];
		return {
			id: row.id,
			location: (row.location as "brickell" | "wynwood") ?? "unknown",
			created_at: row.created_at,
			nps_bucket: row.nps_bucket,
			sentiment_score: row.sentiment_score,
			nps: extractNps(answers),
			answers: answers.map((a) => ({
				question_code: a.question?.code ?? null,
				question_prompt: a.question?.prompt ?? null,
				question_type: a.question?.question_type ?? null,
				value_text: a.value_text ?? null,
				value_number: a.value_number ?? null,
			})),
		};
	});

	return {
		mode: "period_analysis",
		window: {
			start: from ?? null,
			end: to ?? null,
			timezone: "UTC",
		},
		config: {
			max_responses: limit,
			min_responses_for_patterns: 10,
			baseline_window: null,
			allow_personal_data: false,
		},
		data: {
			responses,
			from: from ?? null,
			to: to ?? null,
		},
	};
}

async function backfillActions(
	client: OpenAI,
	topThemes: any[],
	window: { start: string | null; end: string | null; timezone: string | null },
) {
	const system = [
		"You are Tacology's Ops Intelligence Analyst.",
		"Given themes, return JSON with a recommended_actions array, same length and order as themes (max 7).",
		"Each action must be specific, operational, and include: action, owner, why, expected_impact, priority (1..n).",
		"Do not return any other fields. Output strict JSON.",
	].join(" ");

	const user = JSON.stringify({
		window,
		themes: topThemes,
		instructions: "One action per theme, same order, concise but specific. Owners: kitchen|service|manager|bar|host|unknown.",
	});

	const completion = await client.chat.completions.create({
		model: "gpt-4.1-mini",
		temperature: 0.2,
		messages: [
			{ role: "system", content: system },
			{ role: "user", content: user },
		],
		max_tokens: 600,
		response_format: { type: "json_object" },
	});

	const content = completion.choices[0]?.message?.content?.trim() || "";
	console.info("ai/insights actions backfill response", {
		model: completion.model,
		usage: completion.usage,
		preview: content.slice(0, 400),
		length: content.length,
	});
	if (!content) throw new Error("Empty actions backfill response");
	const repaired = jsonrepair(content);
	const parsed = JSON.parse(repaired);
	return Array.isArray(parsed?.recommended_actions) ? parsed.recommended_actions : [];
}

export const runtime = "nodejs";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const parsed = querySchema.parse({
			from: searchParams.get("from") || undefined,
			to: searchParams.get("to") || undefined,
			location: (searchParams.get("location") as "brickell" | "wynwood" | null) || undefined,
			limit: searchParams.get("limit") || undefined,
		});

		const debug = (label: string, meta?: Record<string, unknown>) => {
			console.info(label, meta ? JSON.stringify(meta) : "");
		};

		debug("ai/insights request", {
			from: parsed.from ?? null,
			to: parsed.to ?? null,
			location: parsed.location ?? null,
			limit: parsed.limit ?? null,
			url: request.url,
		});

		const limit = parsed.limit ?? 400;
		const supabase = createServiceClient();
		let query = supabase
			.from("survey_responses")
			.select(
				`id, location, created_at, nps_bucket, sentiment_score,
				answers:survey_answers(
					value_text,
					value_number,
					question:questions(code, prompt, question_type, options)
				)
				`,
			)
			.order("created_at", { ascending: false })
			.limit(limit);

		if (parsed.from) query = query.gte("created_at", parsed.from);
		if (parsed.to) query = query.lte("created_at", parsed.to);
		if (parsed.location) query = query.eq("location", parsed.location);

		const { data, error } = await query;
		if (error) {
			console.error("ai/insights supabase error", error);
			return NextResponse.json({ error: "Failed to load data", details: error.message }, { status: 500 });
		}

		type SupabaseResponse = {
			id: string;
			location: "brickell" | "wynwood" | null;
			created_at: string;
			nps_bucket: string | null;
			sentiment_score: number | null;
			answers:
				| {
					value_text: string | null;
					value_number: number | null;
					question:
						| {
							code: string | null;
							prompt: string | null;
							question_type: string | null;
							options: any;
						}
						| { code: string | null; prompt: string | null; question_type: string | null; options: any }[]
						| null;
				 }[]
				| null;
		};

		const rowsRaw = (data as SupabaseResponse[]) || [];
		debug("ai/insights supabase fetched", {
			rows: rowsRaw.length,
			firstIds: rowsRaw.slice(0, 5).map((r) => r.id),
			locations: Array.from(new Set(rowsRaw.map((r) => r.location || "null"))),
		});

		const rows: ResponseRow[] = rowsRaw
			.map((row) => ({
				id: row.id,
				location: row.location,
				created_at: row.created_at,
				nps_bucket: row.nps_bucket,
				sentiment_score: row.sentiment_score,
				answers:
					Array.isArray(row.answers)
						? row.answers.map((a) => {
							const qRaw = Array.isArray(a.question) ? a.question[0] : a.question;
							return {
								value_text: a.value_text,
								value_number: a.value_number,
								question: qRaw
									? {
										code: qRaw.code ?? null,
										prompt: qRaw.prompt ?? null,
										question_type: qRaw.question_type ?? null,
										options: qRaw.options ?? null,
									}
									: null,
							};
						})
						: [],
			}))
			.filter(Boolean);

		debug("ai/insights normalized rows", {
			rows: rows.length,
			withAnswers: rows.filter((r) => (r.answers?.length || 0) > 0).length,
			first: rows[0]?.id,
		});

		const payload = buildPayload(rows, parsed.from, parsed.to, limit);
		debug("ai/insights payload built", {
			responseCount: payload.data.responses.length,
			from: payload.window.start,
			to: payload.window.end,
			maxResponses: payload.config.max_responses,
			payloadBytes: Buffer.byteLength(JSON.stringify(payload)),
		});

		let completion;
		try {
			console.info("ai/insights openai request", {
				model: "gpt-4.1-mini",
				messages: "system+user",
				payloadPreview: JSON.stringify(payload).slice(0, 500),
			});
			completion = await client.chat.completions.create({
				model: "gpt-4.1-mini",
				temperature: 0.2,
				messages: [
					{ role: "system", content: loadPrompt() },
					{ role: "user", content: JSON.stringify(payload) },
				],
				max_tokens: 1200,
				response_format: { type: "json_object" },
			});
			debug("ai/insights openai response", {
				model: completion.model,
				usage: completion.usage,
				choices: completion.choices?.length,
			});
		} catch (err: any) {
			const code = err?.code || err?.status;
			const isQuota = code === "insufficient_quota" || code === 429;
			const message = err?.message || "OpenAI error";
			if (isQuota) {
				console.error("ai/insights quota error", message);
				return NextResponse.json({ error: "AI quota exceeded. Please check billing or try later." }, { status: 429 });
			}
			console.error("ai/insights completion error", err);
			return NextResponse.json({ error: "AI service unavailable", details: message }, { status: 503 });
		}

		const content = completion.choices[0]?.message?.content?.trim();
		if (!content) {
			debug("ai/insights empty content", { content });
			return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
		}
		debug("ai/insights raw content", { preview: content.slice(0, 400), length: content.length });

		let parsedJson: any = null;
		try {
			parsedJson = JSON.parse(content);
		} catch (err) {
			// Fallback: attempt to repair malformed JSON
			try {
				const repaired = jsonrepair(content);
				parsedJson = JSON.parse(repaired);
				console.warn("ai/insights parse recovered via jsonrepair");
			} catch (errRepair) {
				console.error("ai/insights parse error", err, "repair failed", errRepair, content.slice(0, 4000));
				return NextResponse.json({ error: "Failed to parse AI response", body: content.slice(0, 2000) }, { status: 502 });
			}
		}

		// Ensure recommended_actions cover each top_theme (same order); if missing, backfill via a second AI call
		try {
			const topThemes: any[] = Array.isArray(parsedJson?.patterns?.top_themes) ? parsedJson.patterns.top_themes.slice(0, 7) : [];
			let recs: any[] = Array.isArray(parsedJson?.patterns?.recommended_actions)
				? parsedJson.patterns.recommended_actions
				: [];

			const missing = topThemes.length !== recs.length || recs.some((r: any) => !r?.action);
			if (missing && topThemes.length > 0) {
				console.info("ai/insights actions backfill needed", { topThemes: topThemes.length, recs: recs.length });
				recs = await backfillActions(client, topThemes, parsedJson.window || { start: null, end: null, timezone: "UTC" });
			}

			// Final alignment to ensure array length matches themes
			const aligned = topThemes.map((theme, idx) => recs[idx]).filter(Boolean);

			parsedJson = {
				...parsedJson,
				patterns: {
					...parsedJson?.patterns,
					recommended_actions: aligned,
				},
			};
		} catch (errAlign) {
			console.error("ai/insights alignment error", errAlign);
		}

		return NextResponse.json({ insights: parsedJson, meta: { count: rows.length, model: completion.model } });
	} catch (error: any) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("ai/insights GET error", error);
		return NextResponse.json({ error: "Internal server error", details: error?.message }, { status: 500 });
	}
}
