// Transactional email via Resend (https://resend.com). Requires RESEND_API_KEY
// and RESEND_FROM (a "Name <address@yourdomain>" sender that's been verified
// in the Resend dashboard) env vars. If either is missing, callers should
// gracefully skip sending - same pattern as isZoomConfigured() in zoom.ts.

const RESEND_API = "https://api.resend.com/emails";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!isEmailConfigured()) return false;

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM,
        to: [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
