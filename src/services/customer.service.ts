import { createServiceClient } from "@/lib/supabase/server";

export type NewCustomerCounts = {
	total: number;
	byLocation: {
		brickell: number;
		wynwood: number;
	};
};

export async function getNewCustomerCounts(filters: { from?: string; to?: string }) {
	const supabase = createServiceClient();
	const { from, to } = filters;

	// Derive counts from survey responses so totals and per-location stay consistent.
	let baseResponses = supabase.from("survey_responses").select("customer_id, customer_email, location, created_at");
	if (from) baseResponses = baseResponses.gte("created_at", from);
	if (to) baseResponses = baseResponses.lte("created_at", to);

	const { data: responses, error: responsesError } = await baseResponses;
	if (responsesError) throw responsesError;

	const seenAny = new Set<string>();
	const seenByLocation: Record<"brickell" | "wynwood", Set<string>> = {
		brickell: new Set<string>(),
		wynwood: new Set<string>(),
	};
	const unknownKeys = new Set<string>();

	(responses || []).forEach((row: any) => {
		const key = row.customer_id || row.customer_email;
		if (!key) return;
		seenAny.add(String(key));
		const loc = row.location as "brickell" | "wynwood" | undefined;
		if (!loc || (loc !== "brickell" && loc !== "wynwood")) {
			unknownKeys.add(String(key));
			return;
		}
		seenByLocation[loc].add(String(key));
	});

	const totalByLocation = seenByLocation.brickell.size + seenByLocation.wynwood.size;
	if (totalByLocation !== seenAny.size || unknownKeys.size) {
		console.warn("getNewCustomerCounts mismatch", {
			window: { from, to },
			uniqueSeen: seenAny.size,
			totalByLocation,
			unknownCount: unknownKeys.size,
			sampleUnknown: Array.from(unknownKeys).slice(0, 5),
		});
	}

	return {
		total: totalByLocation,
		byLocation: {
			brickell: seenByLocation.brickell.size,
			wynwood: seenByLocation.wynwood.size,
		},
	} satisfies NewCustomerCounts;
}
