import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteCustomer, getCustomer, updateCustomer } from "@/repositories/customers.repo";

const idSchema = z.object({ id: z.string().uuid() });

const updateSchema = z.object({
	email: z.string().email().optional(),
	name: z.string().trim().optional(),
	phone: z.string().trim().optional(),
});

export async function GET(_: Request, context: { params: { id: string } }) {
	try {
		const { id } = idSchema.parse(context.params);
		const customer = await getCustomer(id);
		return NextResponse.json(customer);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/customer GET error", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
	try {
		const { id } = idSchema.parse(context.params);
		const body = await request.json();
		const payload = updateSchema.parse(body);
		const updated = await updateCustomer(id, payload);
		return NextResponse.json(updated);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/customer PATCH error", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
	try {
		const { id } = idSchema.parse(context.params);
		await deleteCustomer(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json({ error: error.flatten() }, { status: 400 });
		}
		console.error("admin/customer DELETE error", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
