import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const querySchema = z.object({
	questionId: z.string().uuid(),
	location: z.enum(["brickell", "wynwood"]).optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	limit: z.coerce.number().min(1).max(2000).optional(),
	page: z.coerce.number().min(1).max(500).optional(),
	pageSize: z.coerce.number().min(1).max(200).optional(),
	sortBy: z.enum(["answer", "sentiment", "date"]).optional(),
	sortDir: z.enum(["asc", "desc"]).optional(),
	sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
	npsBucket: z.enum(["promoter", "passive", "detractor", "missing"]).optional(),
	format: z.enum(["json", "csv"]).optional(),
	ids: z.array(z.string().uuid()).optional(),
});

export const runtime = "nodejs";

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const ids = searchParams.getAll("id");

		const parsed = querySchema.parse({
			questionId: searchParams.get("questionId"),
			location: (searchParams.get("location") as "brickell" | "wynwood" | null) || undefined,
			from: searchParams.get("from") || undefined,
			to: searchParams.get("to") || undefined,
			limit: searchParams.get("limit") || undefined,
			page: searchParams.get("page") || undefined,
			pageSize: searchParams.get("pageSize") || undefined,
			sortBy: (searchParams.get("sortBy") as "answer" | "sentiment" | "date" | null) || undefined,
			sortDir: (searchParams.get("sortDir") as "asc" | "desc" | null) || undefined,
			sentiment: (searchParams.get("sentiment") as "positive" | "neutral" | "negative" | null) || undefined,
			npsBucket: (searchParams.get("npsBucket") as "promoter" | "passive" | "detractor" | "missing" | null) || undefined,
			format: (searchParams.get("format") as "json" | "csv" | null) || undefined,
			ids: ids.length ? ids : undefined,
		});

		const supabase = createServiceClient();
		const sortBy = parsed.sortBy ?? "date";
		const sortDir = parsed.sortDir ?? "desc";
		const ascending = sortDir === "asc";

		// IMPORTANT:
		// Your embedded relationship is aliased as `response:` in baseSelect,
		// so ordering must use foreignTable/referencedTable = "response".
		const applySorting = (builder: any) => {
			let q = builder;

			if (sortBy === "answer") {
				q = q
					.order("value_text", { ascending, nullsFirst: ascending })
					.order("value_number", { ascending, nullsFirst: ascending })
					// stable tie-breaker for pagination
					.order("created_at", { ascending: false });
				return q;
			}

			if (sortBy === "sentiment") {
				q = q
					.order("sentiment_score", {
						ascending,
						nullsFirst: ascending,
						foreignTable: "response",
					})
					// tie-breaker in the SAME direction
					.order("created_at", { ascending, foreignTable: "response" })
					// final stable tie-breaker
					.order("created_at", { ascending: false });

				return q;
			}

			// date
			q = q
				.order("created_at", { ascending, foreignTable: "response" })
				.order("created_at", { ascending });

			return q;
		};

		const baseSelect = `
			id,
			value_text,
			value_number,
			created_at,
			question:questions (
				id,
				code,
				prompt,
				question_type,
				options
			),
			response:survey_responses!inner (
				id,
				customer_name,
				customer_email,
				location,
				created_at,
				sentiment_score,
				nps_bucket
			)
		`;

		const applyFilters = (builder: any) => {
			let q = builder.eq("question_id", parsed.questionId);

			if (parsed.location) {
				q = q.eq("survey_responses.location", parsed.location);
			}
			if (parsed.from) {
				q = q.gte("survey_responses.created_at", parsed.from);
			}
			if (parsed.to) {
				q = q.lte("survey_responses.created_at", parsed.to);
			}
			if (parsed.npsBucket) {
				if (parsed.npsBucket === "missing") {
					q = q.is("survey_responses.nps_bucket", null);
				} else {
					q = q.eq("survey_responses.nps_bucket", parsed.npsBucket);
				}
			}
			if (parsed.sentiment) {
				if (parsed.sentiment === "positive") {
					q = q.gte("survey_responses.sentiment_score", 0.25);
				} else if (parsed.sentiment === "negative") {
					q = q.lte("survey_responses.sentiment_score", -0.25);
				} else {
					q = q.gte("survey_responses.sentiment_score", -0.25).lte("survey_responses.sentiment_score", 0.25);
				}
			}
			if (parsed.ids && parsed.ids.length) {
				q = q.in("survey_answers.id", parsed.ids);
			}
			return q;
		};

		// CSV export
		if (parsed.format === "csv") {
			const exportLimit = Math.min(parsed.limit ?? 500, 2000);
			let csvQuery = supabase.from("survey_answers").select(baseSelect).limit(exportLimit);
			csvQuery = applyFilters(csvQuery);
			csvQuery = applySorting(csvQuery);

			const { data, error } = await csvQuery;
			if (error) {
				console.error("Failed to export answers", error);
				return NextResponse.json({ error: "Failed to export" }, { status: 500 });
			}

			const rows = data || [];
			const header = ["id", "question_code", "question_prompt", "answer", "sentiment", "location", "customer_name", "customer_email", "created_at"];

			const csvLines = rows.map((row: any) => {
				const q = row.question;
				const answer = row.value_text ?? (row.value_number ?? "");
				const cells = [
					row.id,
					q?.code ?? "",
					q?.prompt ?? "",
					answer,
					row.response?.sentiment_score ?? "",
					row.response?.location ?? "",
					row.response?.customer_name ?? "",
					row.response?.customer_email ?? "",
					row.response?.created_at ?? row.created_at,
				];

				return cells
					.map((cell) => {
						if (cell === null || cell === undefined) return "";
						const str = String(cell);
						if (str.includes(",") || str.includes("\n") || str.includes(`"`)) {
							return `"${str.replace(/"/g, `""`)}"`;
						}
						return str;
					})
					.join(",");
			});

			const csv = [header.join(","), ...csvLines].join("\n");
			return new NextResponse(csv, {
				status: 200,
				headers: {
					"Content-Type": "text/csv; charset=utf-8",
					"Content-Disposition": "attachment; filename=answers.csv",
				},
			});
		}

		// JSON pagination
		const page = parsed.page ?? 1;
		const pageSize = parsed.pageSize ?? parsed.limit ?? 25;
		const offset = (page - 1) * pageSize;

		let query = supabase.from("survey_answers").select(baseSelect, { count: "exact" });
		query = applyFilters(query);
		query = applySorting(query);
		query = query.range(offset, offset + pageSize - 1);

		const { data, error, count } = await query;
		if (error) {
			console.error("Failed to fetch answers", error);
			return NextResponse.json({ error: "Failed to load answers", details: error.message }, { status: 500 });
		}

		return NextResponse.json({
			answers: data ?? [],
			total: count ?? 0,
			page,
			pageSize,
		});
	} catch (err) {
		if (err instanceof z.ZodError) {
			return NextResponse.json({ error: err.flatten() }, { status: 400 });
		}
		console.error("Unexpected error fetching answers", err);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
