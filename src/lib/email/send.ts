import nodemailer from "nodemailer";
import { COUPON_LOGO_URL, FROM_EMAIL, FROM_NAME, SITE_URL, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER } from "@/lib/config";
import { renderCouponEmail } from "./templates";

const COUPON_CTA_URL = process.env.COUPON_CTA_URL || "https://www.sevenrooms.com/reservations/tacology";

function hasSmtpCreds() {
	return SMTP_HOST && SMTP_USER && SMTP_PASS && FROM_EMAIL;
}

export async function sendCouponEmail(to: string, name?: string | null, location?: string | null) {
	if (!hasSmtpCreds()) {
		console.warn("Coupon email skipped: missing SMTP envs");
		return;
	}

	const expires = new Date();
	expires.setMonth(expires.getMonth() + 1);
	const expiresOn = expires.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

	const transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT || 465,
		secure: SMTP_SECURE,
		auth: { user: SMTP_USER, pass: SMTP_PASS },
	});

	const html = renderCouponEmail({
		name,
		location,
		siteUrl: SITE_URL || "",
		ctaUrl: COUPON_CTA_URL,
		logoUrl: COUPON_LOGO_URL || undefined,
		expiresOn,
	});

	await transporter.sendMail({
		from: FROM_NAME ? `${FROM_NAME} <${FROM_EMAIL}>` : FROM_EMAIL,
		to,
		subject: "Your 10% off coupon at Tacology",
		html,
	});
}
