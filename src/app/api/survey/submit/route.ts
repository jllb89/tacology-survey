import { NextResponse } from "next/server";
import { z } from "zod";
import { embedContent } from "@/lib/ai/embeddings";
import { classifySentimentFreeform } from "@/lib/ai/classify";
import { createServiceClient } from "@/lib/supabase/server";
import {
	buildAlertMessage,
	sendAlertEmail,
	sendAlertSms,
} from "@/services/alert.service";
import { sendCouponEmail } from "@/lib/email/send";

const answerSchema = z.object({
	question_id: z.string().uuid(),
	value_text: z.string().optional(),
	value_number: z.number().optional(),
});

const schema = z.object({
	email: z.string().email().optional(),
	name: z.string().trim().min(1).optional(),
	phone: z.string().trim().optional(),
	location: z.enum(["brickell", "wynwood"]),
	answers: z.array(answerSchema).nonempty(),
	improvement_text: z.string().optional(),
});

function deriveNpsBucket(answers: z.infer<typeof answerSchema>[]) {
	const numeric = answers
		.map((a) => a.value_number)
		.filter((n): n is number => typeof n === "number" && n >= 0 && n <= 10);
	if (numeric.length === 0) return null;
	const nps = numeric[0];
	if (nps >= 9) return "promoter" as const;
	if (nps >= 7) return "passive" as const;
	return "detractor" as const;
}

function deriveNpsScore(answers: z.infer<typeof answerSchema>[]) {
	const numeric = answers
		.map((a) => a.value_number)
		.filter((n): n is number => typeof n === "number" && n >= 0 && n <= 10);
	return numeric.length ? numeric[0] : null;
}

export async function POST(request: Request) {
	try {
		const json = await request.json();
		const { email, name, phone, location, answers, improvement_text } = schema.parse(json);
		const normalizedEmail = email?.trim() || null;

		const supabase = createServiceClient();

		// Ensure customer exists
		const { data: customer, error: customerError } = await supabase
			.from("customers")
			.upsert(
				{
					email: normalizedEmail,
					name: name || null,
					phone: phone || null,
				},
				{ onConflict: "email" },
			)
			.select("id, email, name")
			.single();

		if (customerError || !customer) {
			console.error("Failed to upsert customer", customerError);
			return NextResponse.json({ error: "Failed to save survey" }, { status: 500 });
		}

		// Derive simple NPS bucket from numeric answers (assumes a 0–10 rec question present)
		const nps_bucket = deriveNpsBucket(answers);
		const nps_score = deriveNpsScore(answers);

		// Optional sentiment on free-text
		let sentiment_score: number | null = null;
		try {
			const textForSentiment = improvement_text || "";
			sentiment_score = await classifySentimentFreeform(textForSentiment);
		} catch (err) {
			console.error("Sentiment classification failed", err);
		}

		// Create survey response
		const { data: response, error: responseError } = await supabase
			.from("survey_responses")
			.insert({
				customer_id: customer.id,
				customer_email: normalizedEmail,
				customer_name: name || null,
				location,
				completed: true,
				nps_bucket,
				sentiment_score,
			})
			.select("id")
			.single();

		if (responseError || !response) {
			console.error("Failed to insert survey response", responseError);
			return NextResponse.json({ error: "Failed to save survey" }, { status: 500 });
		}

		const responseId = response.id;

		// Insert answers
		const answerRows = answers.map((ans) => ({
			response_id: responseId,
			question_id: ans.question_id,
			value_text: ans.value_text ?? null,
			value_number: ans.value_number ?? null,
		}));

		const { error: answersError } = await supabase.from("survey_answers").insert(answerRows);

		if (answersError) {
			console.error("Failed to insert survey answers", answersError);
			return NextResponse.json({ error: "Failed to save survey answers" }, { status: 500 });
		}

		// Build content for embedding
		const answerText = answers
			.map((a, idx) => `Q${idx + 1}: ${a.value_text ?? ""} ${a.value_number ?? ""}`)
			.join("\n");
		const content = [
			normalizedEmail ? `Email: ${normalizedEmail}` : null,
			name ? `Name: ${name}` : null,
			`Location: ${location}`,
			improvement_text ? `Improvement: ${improvement_text}` : null,
			`Answers:\n${answerText}`,
		]
			.filter(Boolean)
			.join("\n");

		// Generate embedding
		try {
			const { embedding, model } = await embedContent(content);
			const { error: embedError } = await supabase.from("response_embeddings").insert({
				response_id: responseId,
				model,
				content,
				embedding,
			});

			if (embedError) {
				console.error("Failed to store embedding", embedError);
			}
		} catch (embedError) {
			console.error("Embedding generation failed", embedError);
		}


		// Fire alerts for detractors / negative sentiment (non-blocking)
		const shouldAlert =
			(nps_score !== null && nps_score <= 6) || (sentiment_score !== null && sentiment_score <= -0.2);

		const backgroundSends: Array<Promise<unknown>> = [];
		if (normalizedEmail) {
			backgroundSends.push(sendCouponEmail(normalizedEmail, name, location));
		}
		if (shouldAlert) {
			const message = buildAlertMessage({
				email,
				name,
				location,
				nps: nps_score,
				sentiment: sentiment_score,
				improvement_text,
			});
			backgroundSends.push(sendAlertEmail("Tacology survey alert", message));
			backgroundSends.push(sendAlertSms(message));
		}

		Promise.allSettled(backgroundSends).catch((err) => console.error("Async dispatch failed", err));

		return NextResponse.json({ responseId });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("Unexpected error in survey submit", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
