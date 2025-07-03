// lib/emailTemplates.ts

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Build the “Thank You / 10% Off” email
 */
export function buildThankYouEmail(
  name: string,
  toEmail: string
): EmailContent {
  const safeName = name?.trim() || 'there';
  const subject = 'Thanks for your feedback – show this for 10% off!';
  const text = `Hi ${safeName},\n\n` +
    `Thank you for completing our survey! ` +
    `Show this email to your waiter to receive 10% off your next visit to Tacology.\n\n` +
    `We appreciate your input—see you soon!\n` +
    `Tacology Miami`;

  // Build a base URL so images resolve correctly in the email
  // e.g. https://yourdomain.com
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? '';

  // These files must live in /public: logo.svg and 10off.svg
  const logoUrl = `${baseUrl}/logo.svg`;
  const discountLogoUrl = `${baseUrl}/10off.svg`;

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#EB5A95;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding:24px;">
          <!-- Main Logo -->
          <img src="${logoUrl}" width="180" height="90" alt="Tacology Logo" style="display:block;margin-bottom:24px;" />

          <!-- Headline -->
          <h1 style="margin:0 0 16px;font-size:24px;color:#000;">Thank you for your feedback!</h1>

          <!-- Body copy -->
          <p style="margin:0 0 24px;font-size:16px;color:#000;line-height:1.4;">
            Show this email to your waiter to receive <strong>10% off</strong> your next visit to Tacology.
          </p>

          <!-- Discount Logo -->
          <img src="${discountLogoUrl}" width="260" height="130" alt="10% Off!" style="display:block;margin-top:16px;" />
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  return { subject, text, html };
}
