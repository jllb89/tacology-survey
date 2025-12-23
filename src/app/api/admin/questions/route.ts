import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("questions")
		.select("id, code, prompt, question_type, options, sort_order, group_key")
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("Failed to fetch questions", error);
		return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
	}

	return NextResponse.json({ questions: data ?? [] });
}

export async function PUT(request: Request) {
	try {
		const json = await request.json().catch(() => ({}));
		const list = Array.isArray((json as any)?.questions) ? (json as any).questions : null;
		if (!list) {
			return NextResponse.json({ error: "Invalid payload: questions[] required" }, { status: 400 });
		}

		const supabase = createServiceClient();

		const payload = list.map((q: any) => ({
			id: q.id ?? undefined,
			code: q.code,
			prompt: q.prompt,
			question_type: q.question_type,
			options: q.options ?? {},
			sort_order: Number.isFinite(q.sort_order) ? q.sort_order : 0,
			group_key: q.group_key ?? "core_v2",
		}));

		// Basic required checks
		for (const item of payload) {
			if (!item.code || !item.prompt || !item.question_type) {
				return NextResponse.json({ error: "Invalid question payload" }, { status: 400 });
			}
		}

		const { error } = await supabase
			.from("questions")
			.upsert(payload, { onConflict: "code" })
			.select("id");
		if (error) {
			console.error("Failed to upsert questions", error);
			return NextResponse.json(
				{ error: "Failed to save", details: error.message },
				{ status: 500 },
			);
		}

		return NextResponse.json({ ok: true });
	} catch (err: any) {
		console.error(err);
		return NextResponse.json(
			{ error: "Invalid payload", details: err?.message },
			{ status: 400 },
		);
	}
}
