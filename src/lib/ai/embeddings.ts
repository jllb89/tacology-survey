import OpenAI from "openai";
import { OPENAI_API_KEY, requireEnv } from "@/lib/config";

const client = new OpenAI({ apiKey: requireEnv(OPENAI_API_KEY, "OPENAI_API_KEY") });

export type EmbeddingResult = {
	embedding: number[];
	model: string;
};

export async function embedContent(
	content: string,
	model = "text-embedding-3-small",
): Promise<EmbeddingResult> {
	const response = await client.embeddings.create({
		model,
		input: content,
	});

	const vector = response.data[0]?.embedding;
	if (!vector) {
		throw new Error("Failed to generate embedding");
	}

	return { embedding: vector, model: response.model ?? model };
}
