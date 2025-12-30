import { NextResponse } from "next/server";
import { z } from "zod";
import { listCustomerVisits } from "@/repositories/visits.repo";

const idSchema = z.object({ id: z.string().uuid() });

export async function GET(_: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
	try {
		const params = await context.params;
		const { id } = idSchema.parse(params);
		console.info("admin/customer visits GET", { id });
		const visits = await listCustomerVisits(id);
		return NextResponse.json({ visits });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/customer visits GET error", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				details: (error as any)?.message || null,
				code: (error as any)?.code || null,
				hint: (error as any)?.hint || null,
			},
			{ status: 500 },
		);
	}
}
