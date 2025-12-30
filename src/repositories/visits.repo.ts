import { createServiceClient } from "@/lib/supabase/server";

export type VisitAnswer = {
	id: string;
	value_text: string | null;
	value_number: number | null;
	question: {
		id: string;
		code: string;
		prompt: string;
		question_type: string;
		options: any;
	};
};

export type Visit = {
	id: string;
	location: "brickell" | "wynwood";
	created_at: string;
	answers: VisitAnswer[];
};

export async function listCustomerVisits(customerId: string) {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("survey_responses")
		.select(
			`id, location, created_at,
			answers:survey_answers(
				id,
				value_text,
				value_number,
				question:questions(id, code, prompt, question_type, options)
			)`,
		)
		.eq("customer_id", customerId)
		.order("created_at", { ascending: false });

	if (error) throw error;

	const visits = ((data as any[]) || []).map((row) => ({
		id: row.id as string,
		location: row.location as "brickell" | "wynwood",
		created_at: row.created_at as string,
		answers: ((row.answers as any[]) || []).map((ans) => ({
			id: ans.id as string,
			value_text: ans.value_text as string | null,
			value_number: ans.value_number as number | null,
			question: (Array.isArray(ans.question) ? ans.question[0] : ans.question) as VisitAnswer["question"],
		})),
	}));

	return visits as Visit[];
}
