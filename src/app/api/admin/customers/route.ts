import { NextResponse } from "next/server";
import { z } from "zod";
import { createCustomer, listCustomers } from "@/repositories/customers.repo";

const listSchema = z.object({
	limit: z.coerce.number().int().min(1).max(200).optional(),
	offset: z.coerce.number().int().min(0).optional(),
	search: z.string().optional(),
});

const createSchema = z.object({
	email: z.string().email(),
	name: z.string().trim().optional(),
	phone: z.string().trim().optional(),
});

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const parsed = listSchema.parse({
			limit: searchParams.get("limit"),
			offset: searchParams.get("offset"),
			search: searchParams.get("search") || undefined,
		});

		const { data, count } = await listCustomers(parsed);
		return NextResponse.json({ data, count });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/customers GET error", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const body = await request.json();
		const parsed = createSchema.parse(body);
		const customer = await createCustomer({
			email: parsed.email,
			name: parsed.name || null,
			phone: parsed.phone || null,
		});
		return NextResponse.json(customer, { status: 201 });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/customers POST error", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
