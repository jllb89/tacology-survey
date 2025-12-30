import { createServiceClient } from "@/lib/supabase/server";

export type Customer = {
	id: string;
	name: string | null;
	email: string;
	phone: string | null;
	created_at: string;
	updated_at: string;
};

export async function listCustomers(params: {
	limit?: number;
	offset?: number;
	search?: string;
	from?: string;
	to?: string;
	location?: "brickell" | "wynwood";
}) {
	const { limit = 50, offset = 0, search, from, to, location } = params;
	const supabase = createServiceClient();

	let customerIds: string[] | null = null;
	let customerEmails: string[] | null = null;

	if (from || to || location) {
		let respQuery = supabase.from("survey_responses").select("customer_id, customer_email");
		if (from) respQuery = respQuery.gte("created_at", from);
		if (to) respQuery = respQuery.lte("created_at", to);
		if (location) respQuery = respQuery.eq("location", location);
		const { data: respData, error: respError } = await respQuery;
		if (respError) {
			console.error("listCustomers survey_responses error", respError, JSON.stringify(respError));
			throw respError;
		}
		const ids = new Set<string>();
		const emails = new Set<string>();
		(respData || []).forEach((row: any) => {
			if (row.customer_id) ids.add(row.customer_id);
			if (row.customer_email) emails.add(row.customer_email);
		});
		customerIds = Array.from(ids);
		customerEmails = Array.from(emails);
		console.info("listCustomers filters", {
			from,
			to,
			location,
			idCount: customerIds.length,
			emailCount: customerEmails.length,
			idSample: customerIds.slice(0, 3),
			emailSample: customerEmails.slice(0, 3),
		});

		// If filters were applied but no responses matched, return empty result immediately.
		const matchCount = (customerIds?.length ?? 0) + (customerEmails?.length ?? 0);
		if (matchCount === 0) {
			return { data: [], count: 0 };
		}
	}

	// When filters are applied, run chunked lookups to avoid very long IN query strings.
	if (from || to || location) {
		const results = new Map<string, Customer>();
		const chunkSize = 150;

		async function fetchChunks(field: "id" | "email", values: string[]) {
			for (let i = 0; i < values.length; i += chunkSize) {
				const slice = values.slice(i, i + chunkSize);
				if (slice.length === 0) continue;
				const { data, error } = await supabase
					.from("customers")
					.select("id, name, email, phone, created_at, updated_at")
					.in(field, slice);
				if (error) {
					console.error("listCustomers chunk error", field, slice.length, error, JSON.stringify(error));
					throw error;
				}
				(data as Customer[]).forEach((c) => {
					const key = c.id || c.email;
					if (!results.has(key)) results.set(key, c);
				});
			}
		}

		if (customerIds && customerIds.length) {
			await fetchChunks("id", customerIds);
		}
		if (customerEmails && customerEmails.length) {
			await fetchChunks("email", customerEmails);
		}

		let list = Array.from(results.values());
		if (search) {
			const needle = search.toLowerCase();
			list = list.filter((c) => c.email.toLowerCase().includes(needle));
		}
		list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
		const sliced = list.slice(offset, offset + limit);
		return { data: sliced, count: list.length };
	}

	// No filters: simple paginated query.
	let query = supabase.from("customers").select("id, name, email, phone, created_at, updated_at", { count: "exact" });

	if (search) {
		query = query.ilike("email", `%${search}%`);
	}

	const { data, error, count } = await query
		.order("created_at", { ascending: false })
		.range(offset, offset + limit - 1);

	if (error) {
		console.error("listCustomers customers query error", error, JSON.stringify(error), {
			message: (error as any)?.message,
			code: (error as any)?.code,
			details: (error as any)?.details,
			hint: (error as any)?.hint,
		});
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
