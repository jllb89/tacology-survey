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

	let baseCustomers = supabase.from("customers").select("id, created_at");
	if (from) baseCustomers = baseCustomers.gte("created_at", from);
	if (to) baseCustomers = baseCustomers.lte("created_at", to);

	const { data: customers, error: customersError } = await baseCustomers;
	if (customersError) throw customersError;

	let baseResponses = supabase
		.from("survey_responses")
		.select("customer_id, customer_email, location, created_at");
	if (from) baseResponses = baseResponses.gte("created_at", from);
	if (to) baseResponses = baseResponses.lte("created_at", to);

	const { data: responses, error: responsesError } = await baseResponses;
	if (responsesError) throw responsesError;

	const seenByLocation: Record<"brickell" | "wynwood", Set<string>> = {
		brickell: new Set<string>(),
		wynwood: new Set<string>(),
	};

	(responses || []).forEach((row: any) => {
		const key = row.customer_id || row.customer_email;
		if (!key) return;
		const loc = row.location as "brickell" | "wynwood" | undefined;
		if (!loc) return;
		seenByLocation[loc].add(String(key));
	});

	return {
		total: customers?.length ?? 0,
		byLocation: {
			brickell: seenByLocation.brickell.size,
			wynwood: seenByLocation.wynwood.size,
		},
	} satisfies NewCustomerCounts;
}
