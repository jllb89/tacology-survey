export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 0;
export const SMTP_SECURE = process.env.SMTP_SECURE === "true";
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || "";
export const FROM_EMAIL = process.env.FROM_EMAIL || "";
export const FROM_NAME = process.env.FROM_NAME || "";
export const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
export const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
export const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER || "";
export const ALERT_TO_NUMBER = process.env.ALERT_TO_NUMBER || "";

export function requireEnv(value: string, name: string) {
	if (!value) {
		throw new Error(`Missing env var: ${name}`);
	}
	return value;
}
