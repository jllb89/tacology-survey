import { embedContent } from "@/lib/ai/embeddings";
import { createServiceClient } from "@/lib/supabase/server";

type MatchResult = {
	response_id: string;
	content: string;
	similarity: number;
};

export async function searchSimilarResponses(params: {
	query: string;
	matchCount?: number;
	matchThreshold?: number;
}) {
	const { query, matchCount = 10, matchThreshold = 0.3 } = params;
	const supabase = createServiceClient();
	const { embedding } = await embedContent(query);

	const { data, error } = await supabase.rpc("match_response_embeddings", {
		query_embedding: embedding,
		match_count: matchCount,
		match_threshold: matchThreshold,
	});

	if (error) {
		console.error("match_response_embeddings failed", error);
		return [] as MatchResult[];
	}

	return (data as MatchResult[]) || [];
}
