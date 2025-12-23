import { NextResponse } from "next/server";
import { z } from "zod";
import { getSurveyStats } from "@/services/stats.service";

const querySchema = z.object({
	location: z.enum(["brickell", "wynwood"]).optional(),
	from: z.string().optional(),
	to: z.string().optional(),
});

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const parsed = querySchema.parse({
			location: searchParams.get("location") || undefined,
			from: searchParams.get("from") || undefined,
			to: searchParams.get("to") || undefined,
		});

		const stats = await getSurveyStats(parsed);
		return NextResponse.json({
			total: stats.total,
			byLocation: stats.byLocation,
			byDay: stats.byDay,
			sentiment: stats.sentimentBuckets,
			nps: stats.nps,
			npsScore: stats.npsScore,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/stats error", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
