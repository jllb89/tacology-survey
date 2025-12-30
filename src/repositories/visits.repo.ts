import { createServiceClient } from "@/lib/supabase/server";

export type Visit = {
	id: string;
	location: "brickell" | "wynwood";
	created_at: string;
};

export async function listCustomerVisits(customerId: string) {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("survey_responses")
		.select("id, location, created_at")
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });

	if (error) throw error;

	return (data as Visit[]) || [];
}
