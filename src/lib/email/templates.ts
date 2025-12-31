type CouponTemplateInput = {
	name?: string | null;
	location?: string | null;
	siteUrl: string;
	ctaUrl: string;
	logoUrl?: string;
	expiresOn?: string;
};

export function renderCouponEmail({ name, location, siteUrl, ctaUrl, logoUrl, expiresOn }: CouponTemplateInput) {
	const safeSite = siteUrl?.replace(/\/$/, "") || "";
	const resolvedLogo =
		logoUrl ||
		(safeSite ? `${safeSite}/taco-cartoon2.png` : "") ||
		`${safeSite || ""}/tacologo2.svg`;
	const bgUrl = `${safeSite || ""}/taco-bg.webp`;
	const firstName = name?.split(" ")[0] || "Tacology friend";
	const loc = location ? location.charAt(0).toUpperCase() + location.slice(1) : "Tacology";

	return `<!DOCTYPE html>
	<html lang="en">
		<head>
			<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>Your 10% OFF at Tacology</title>
			<style>
				:root { color-scheme: light; }
				* { margin: 0; padding: 0; }
				body { background: #f8f6f7; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; }
				a { color: inherit; text-decoration: none; }
			</style>
		</head>
		<body style="margin:0; padding:0; background:#f8f6f7;">
			<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f8f6f7; padding:24px 12px;">
				<tr>
					<td align="center">
						<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px; background:#ffffff; border-radius:18px; box-shadow:0 10px 40px rgba(0,0,0,0.06); overflow:hidden; border:1px solid #f3e0ea;">
							<tr>
								<td style="background: radial-gradient(circle at 20% 20%, rgba(235,90,149,0.12), transparent 35%), radial-gradient(circle at 80% 10%, rgba(0,0,0,0.06), transparent 30%), #ffffff; padding:28px 28px 16px 28px; text-align:center;">
									  <img src="${resolvedLogo}" alt="Tacology" width="140" style="display:block; margin:0 auto 16px auto;" />
									<div style="display:inline-block; background:#fdf2f8; color:#be185d; font-weight:700; padding:10px 18px; border-radius:999px; font-size:13px; letter-spacing:0.4px;">10% OFF COUPON</div>
									<h1 style="margin:18px 0 8px 0; font-size:26px; line-height:1.2; font-weight:800; color:#111827;">${firstName}, thanks for visiting ${loc}!</h1>
									<p style="margin:0 0 14px 0; font-size:15px; line-height:1.6; color:#374151;">Enjoy 10% off your next visit. Show this email at checkout or when booking.</p>
									<a href="${ctaUrl}" style="display:inline-block; margin-top:8px; background:#eb5a95; color:#ffffff; padding:12px 22px; border-radius:999px; font-weight:700; font-size:14px; text-decoration:none;">Book your table</a>
								</td>
							</tr>
							<tr>
								<td style="padding:0 28px 22px 28px;">
									<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-image:url('${bgUrl}'); background-size:cover; background-position:center; border-radius:14px; overflow:hidden;">
										<tr>
											<td style="background:rgba(255,255,255,0.92); padding:18px 18px 20px 18px; text-align:center;">
												<p style="margin:0; font-size:14px; line-height:1.6; color:#4b5563;">Here’s your code:</p>
												<div style="margin:10px auto 0 auto; display:inline-block; background:#111827; color:#ffffff; padding:12px 16px; border-radius:12px; letter-spacing:1.2px; font-weight:800; font-size:15px;">10OFF-TACOLOGY</div>
												<p style="margin:14px 0 0 0; font-size:12px; line-height:1.5; color:#6b7280;">Show this coupon at payment. One-time use. Valid for dine-in only. Not combinable with other offers. We can’t wait to see you again!${expiresOn ? `<br /><strong style=\"color:#111827;\">Expires: ${expiresOn}</strong>` : ""}</p>
											</td>
										</tr>
									</table>
								</td>
							</tr>
							<tr>
								<td style="padding:0 28px 28px 28px; text-align:center;">
									<p style="margin:0; font-size:12px; line-height:1.5; color:#9ca3af;">Tacology — Brickell & Wynwood</p>
									<p style="margin:6px 0 0 0; font-size:12px; line-height:1.5; color:#9ca3af;">
										<a href="${safeSite || ctaUrl}" style="color:#9ca3af; text-decoration:underline;">Visit our site</a>
									</p>
								</td>
							</tr>
						</table>
					</td>
				</tr>
			</table>
		</body>
	</html>`;
}
