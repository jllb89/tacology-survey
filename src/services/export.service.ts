import { createServiceClient } from "@/lib/supabase/server";

function toCsv(rows: Record<string, any>[]) {
	if (rows.length === 0) return "";
	const headers = Object.keys(rows[0]);
	const lines = [headers.join(",")];
	for (const row of rows) {
		const line = headers
			.map((h) => {
				const val = row[h];
				if (val === null || val === undefined) return "";
				const str = String(val).replace(/"/g, '""');
				return str.includes(",") || str.includes("\n") ? `"${str}"` : str;
			})
			.join(",");
		lines.push(line);
	}
	return lines.join("\n");
}

export async function exportCustomersCsv() {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("customers")
		.select("id, name, email, phone, created_at, updated_at")
		.order("created_at", { ascending: false });
	if (error) throw error;
	return toCsv(data || []);
}

export async function exportResponsesCsv() {
	const supabase = createServiceClient();
	const { data, error } = await supabase
		.from("survey_responses")
		.select("id, customer_email, customer_name, location, created_at, completed")
		.order("created_at", { ascending: false });
	if (error) throw error;
	return toCsv(data || []);
}
