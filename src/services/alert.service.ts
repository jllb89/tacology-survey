import nodemailer from "nodemailer";
import Twilio from "twilio";
import {
	ALERT_TO_NUMBER,
	FROM_EMAIL,
	FROM_NAME,
	SMTP_HOST,
	SMTP_PASS,
	SMTP_PORT,
	SMTP_SECURE,
	SMTP_USER,
	TWILIO_ACCOUNT_SID,
	TWILIO_AUTH_TOKEN,
	TWILIO_FROM_NUMBER,
} from "@/lib/config";

const hasSmtpCreds = () => SMTP_HOST && SMTP_USER && SMTP_PASS && FROM_EMAIL;
const hasTwilioCreds = () =>
	TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER && ALERT_TO_NUMBER;

export async function sendAlertEmail(subject: string, text: string) {
	if (!hasSmtpCreds()) {
		console.warn("Alert email skipped: missing SMTP envs");
		return;
	}

	const transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT || 465,
		secure: SMTP_SECURE,
		auth: { user: SMTP_USER, pass: SMTP_PASS },
	});

	await transporter.sendMail({
		from: FROM_NAME ? `${FROM_NAME} <${FROM_EMAIL}>` : FROM_EMAIL,
		to: FROM_EMAIL,
		subject,
		text,
	});
}

export async function sendAlertSms(text: string) {
	if (!hasTwilioCreds()) {
		console.warn("Alert SMS skipped: missing Twilio envs");
		return;
	}

	const client = Twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
	await client.messages.create({ to: ALERT_TO_NUMBER, from: TWILIO_FROM_NUMBER, body: text });
}

export function buildAlertMessage(input: {
	email?: string | null;
	name?: string | null;
	location: string;
	nps?: number | null;
	sentiment?: number | null;
	improvement_text?: string | null;
}) {
	const emailDisplay = input.email || "no email provided";
	const lines = [
		"New low-sentiment survey detected",
		`Location: ${input.location}`,
		`Customer: ${input.name ? `${input.name} (${emailDisplay})` : emailDisplay}`,
		input.nps !== undefined && input.nps !== null ? `NPS: ${input.nps}` : null,
		input.sentiment !== undefined && input.sentiment !== null
			? `Sentiment score: ${input.sentiment.toFixed(2)}`
			: null,
		input.improvement_text ? `Feedback: ${input.improvement_text}` : null,
	].filter(Boolean);

	return lines.join("\n");
}
