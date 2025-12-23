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
			format: (searchParams.get("format") as "json" | "csv" | null) || undefined,
			ids: ids.length ? ids : undefined,
		});

		const supabase = createServiceClient();

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
			let q = builder.eq("question_id", parsed.questionId).order("created_at", { ascending: false });
			if (parsed.location) {
				q = q.eq("survey_responses.location", parsed.location);
			}
			if (parsed.from) {
				q = q.gte("survey_responses.created_at", parsed.from);
			}
			if (parsed.to) {
				q = q.lte("survey_responses.created_at", parsed.to);
			}
			if (parsed.ids && parsed.ids.length) {
				q = q.in("survey_answers.id", parsed.ids);
			}
			return q;
		};

		if (parsed.format === "csv") {
			const exportLimit = Math.min(parsed.limit ?? 500, 2000);
			let csvQuery = supabase
				.from("survey_answers")
				.select(baseSelect)
				.limit(exportLimit);
			csvQuery = applyFilters(csvQuery);
			const { data, error } = await csvQuery;
			if (error) {
				console.error("Failed to export answers", error);
				return NextResponse.json({ error: "Failed to export" }, { status: 500 });
			}

			const rows = data || [];
			const header = [
				"id",
				"question_code",
				"question_prompt",
				"answer",
				"sentiment",
				"location",
				"customer_name",
				"customer_email",
				"created_at",
			];
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
						if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
							return `"${str.replace(/"/g, '""')}"`;
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

		const page = parsed.page ?? 1;
		const pageSize = parsed.pageSize ?? parsed.limit ?? 25;
		const offset = (page - 1) * pageSize;
		let query = supabase
			.from("survey_answers")
			.select(baseSelect, { count: "exact" })
			.range(offset, offset + pageSize - 1);
		query = applyFilters(query);

		const { data, error, count } = await query;
		if (error) {
			console.error("Failed to fetch answers", error);
			return NextResponse.json({ error: "Failed to load answers" }, { status: 500 });
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
