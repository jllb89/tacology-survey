import { createServiceClient } from "@/lib/supabase/server";

export type StatsFilters = {
	location?: "brickell" | "wynwood";
	from?: string; // ISO date
	to?: string; // ISO date
};

type RespRow = {
	id: string;
	location: string;
	created_at: string;
	sentiment_score: number | null;
	nps_bucket: string | null;
};

export async function getSurveyStats(filters: StatsFilters) {
	const supabase = createServiceClient();
	let base = supabase
		.from("survey_responses")
		.select("id, location, created_at, sentiment_score, nps_bucket");

	if (filters.location) {
		base = base.eq("location", filters.location);
	}
	if (filters.from) {
		base = base.gte("created_at", filters.from);
	}
	if (filters.to) {
		base = base.lte("created_at", filters.to);
	}

	const { data, error } = await base;
	if (error) throw error;

	const rows: RespRow[] = (data as RespRow[]) || [];

	const total = rows.length;

	const byLocation: Record<string, number> = {};
	const byDay: Record<string, number> = {};
	const sentimentBuckets = { negative: 0, neutral: 0, positive: 0, missing: 0 };
	const nps = { promoters: 0, passives: 0, detractors: 0, missing: 0 };

	rows.forEach((row) => {
		byLocation[row.location] = (byLocation[row.location] || 0) + 1;
		const day = row.created_at.slice(0, 10);
		byDay[day] = (byDay[day] || 0) + 1;

		if (row.sentiment_score === null || row.sentiment_score === undefined) {
			sentimentBuckets.missing += 1;
		} else if (row.sentiment_score < -0.2) {
			sentimentBuckets.negative += 1;
		} else if (row.sentiment_score > 0.2) {
			sentimentBuckets.positive += 1;
		} else {
			sentimentBuckets.neutral += 1;
		}

		if (!row.nps_bucket) {
			nps.missing += 1;
		} else if (row.nps_bucket === "promoter") {
			nps.promoters += 1;
		} else if (row.nps_bucket === "passive") {
			nps.passives += 1;
		} else if (row.nps_bucket === "detractor") {
			nps.detractors += 1;
		}
	});

	const npsScore = (() => {
		const base = nps.promoters + nps.passives + nps.detractors;
		if (base === 0) return null;
		return ((nps.promoters - nps.detractors) / base) * 100;
	})();

	return { total, byLocation, byDay, sentimentBuckets, nps, npsScore };
}
