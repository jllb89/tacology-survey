import { createServiceClient } from "@/lib/supabase/server";

export type Customer = {
	id: string;
	name: string | null;
	email: string;
	phone: string | null;
	created_at: string;
	updated_at: string;
};

export async function listCustomers(params: { limit?: number; offset?: number; search?: string }) {
	const { limit = 50, offset = 0, search } = params;
	const supabase = createServiceClient();
	let query = supabase.from("customers").select("id, name, email, phone, created_at, updated_at", { count: "exact" });

	if (search) {
		query = query.ilike("email", `%${search}%`);
	}

	const { data, error, count } = await query
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		throw error;
	}

	return { data: (data as Customer[]) || [], count: count ?? 0 };
}

export async function getCustomer(id: string) {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("customers")
		.select("id, name, email, phone, created_at, updated_at")
		.eq("id", id)
		.single();
	if (error) throw error;
	return data as Customer;
}

export async function createCustomer(input: { name?: string | null; email: string; phone?: string | null }) {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("customers")
		.insert({
			name: input.name || null,
			email: input.email,
			phone: input.phone || null,
		})
		.select("id, name, email, phone, created_at, updated_at")
		.single();
	if (error) throw error;
	return data as Customer;
}

export async function updateCustomer(
	id: string,
	input: { name?: string | null; email?: string; phone?: string | null },
) {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("customers")
		.update({
			name: input.name ?? null,
			email: input.email,
			phone: input.phone ?? null,
		})
		.eq("id", id)
		.select("id, name, email, phone, created_at, updated_at")
		.single();
	if (error) throw error;
	return data as Customer;
}

export async function deleteCustomer(id: string) {
	const supabase = createServiceClient();
	const { error } = await supabase.from("customers").delete().eq("id", id);
	if (error) throw error;
}
