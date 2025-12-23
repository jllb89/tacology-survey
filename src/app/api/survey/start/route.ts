import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
	email: z.string().email(),
	name: z.string().trim().min(1).optional(),
	phone: z.string().trim().optional(),
	location: z.enum(["brickell", "wynwood"]),
});

export async function POST(request: Request) {
	try {
		const json = await request.json();
		const { email, name, phone, location } = schema.parse(json);

		const supabase = createServiceClient();

		// Upsert customer by email
		const { data: customer, error: upsertError } = await supabase
			.from("customers")
			.upsert(
				{
					email,
					name: name || null,
					phone: phone || null,
				},
				{ onConflict: "email" },
			)
			.select("id, email, name, phone")
			.single();

		if (upsertError) {
			console.error("Failed to upsert customer", upsertError);
			return NextResponse.json({ error: "Failed to start survey" }, { status: 500 });
		}

		// Return basic context for follow-on submit call
		return NextResponse.json({
			customerId: customer?.id,
			email: customer?.email,
			name: customer?.name,
			phone: customer?.phone,
			location,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("Unexpected error in survey start", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
