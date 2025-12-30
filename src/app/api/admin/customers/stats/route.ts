import { NextResponse } from "next/server";
import { z } from "zod";
import { getNewCustomerCounts } from "@/services/customer.service";

const querySchema = z.object({
	from: z.string().optional(),
	to: z.string().optional(),
});

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const parsed = querySchema.parse({
			from: searchParams.get("from") || undefined,
			to: searchParams.get("to") || undefined,
		});

		const counts = await getNewCustomerCounts(parsed);
		return NextResponse.json({ totalNew: counts.total, byLocation: counts.byLocation });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/customers/stats GET error", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
