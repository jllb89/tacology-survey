import { createClient } from "@supabase/supabase-js";
import {
	SUPABASE_SERVICE_ROLE_KEY,
	SUPABASE_URL,
	requireEnv,
} from "@/lib/config";

export function createServiceClient() {
	const url = requireEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
	const serviceRoleKey = requireEnv(
		SUPABASE_SERVICE_ROLE_KEY,
		"SUPABASE_SERVICE_ROLE_KEY",
	);

	return createClient(url, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
