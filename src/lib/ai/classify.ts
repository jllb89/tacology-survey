import OpenAI from "openai";
import { OPENAI_API_KEY, requireEnv } from "@/lib/config";

const client = new OpenAI({ apiKey: requireEnv(OPENAI_API_KEY, "OPENAI_API_KEY") });

export async function classifySentimentFreeform(text: string): Promise<number | null> {
	if (!text.trim()) return null;

	const completion = await client.chat.completions.create({
		model: "gpt-4o-mini",
		messages: [
			{
				role: "system",
				content:
					"You are a sentiment rater. Return only a JSON object with key 'score' in [-1,1], where -1 is very negative, 0 is neutral, +1 very positive.",
			},
			{
				role: "user",
				content: text,
			},
		],
		response_format: { type: "json_object" },
		temperature: 0,
	});

	const raw = completion.choices[0]?.message?.content;
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		const score = Number(parsed.score);
		if (Number.isFinite(score)) {
			return Math.max(-1, Math.min(1, score));
		}
	} catch (err) {
		console.error("Sentiment parse error", err);
	}
	return null;
}
