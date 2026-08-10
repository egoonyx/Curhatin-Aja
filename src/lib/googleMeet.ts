// Google Meet via a domain-wide-delegated service account.
//
// Requires GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
// and GOOGLE_IMPERSONATE_EMAIL env vars:
//   - GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY come
//     from the service account's downloaded JSON key (client_email / private_key).
//     The private key is normally pasted with literal "\n" sequences - this
//     file converts those back into real newlines.
//   - GOOGLE_IMPERSONATE_EMAIL is the curhatingroup.id Workspace mailbox whose
//     calendar should own every meeting the app creates (the service account
//     must be authorized for domain-wide delegation with the
//     https://www.googleapis.com/auth/calendar scope in admin.google.com).
//
// If any of these are missing, callers should gracefully skip the Meet link
// (same pattern as isZoomConfigured() in zoom.ts).
//
// No googleapis dependency needed - this signs its own short-lived JWT with
// Node's built-in crypto module and talks to the REST API directly, the same
// minimal-dependency style as zoom.ts and email.ts.

import crypto from "crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

export function isGoogleMeetConfigured() {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_IMPERSONATE_EMAIL
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(): Promise<string | null> {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const impersonate = process.env.GOOGLE_IMPERSONATE_EMAIL;
  if (!clientEmail || !rawKey || !impersonate) return null;

  const privateKey = rawKey.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: clientEmail,
    sub: impersonate,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;

  let signature: Buffer;
  try {
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    signature = signer.sign(privateKey);
  } catch {
    return null;
  }

  const assertion = `${unsigned}.${base64url(signature)}`;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function deleteGoogleMeetEvent(eventId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(
      `${CALENDAR_BASE}/calendars/primary/events/${eventId}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    // Google returns 204/200 on success; treat "already gone" as success too.
    return res.ok || res.status === 404 || res.status === 410;
  } catch {
    return false;
  }
}

export async function createGoogleMeetEvent({
  title,
  description,
  startTime,
  endTime,
  attendeeEmails,
}: {
  title: string;
  description?: string | null;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  attendeeEmails?: string[];
}): Promise<{ joinUrl: string; eventId: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(
      `${CALENDAR_BASE}/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: title,
          description: description || undefined,
          start: { dateTime: startTime },
          end: { dateTime: endTime },
          attendees: (attendeeEmails ?? []).map((email) => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: `curhatin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();

    const joinUrl: string | undefined =
      data.hangoutLink ??
      data.conferenceData?.entryPoints?.find(
        (e: { entryPointType?: string; uri?: string }) => e.entryPointType === "video"
      )?.uri;

    if (!joinUrl || !data.id) return null;
    return { joinUrl, eventId: String(data.id) };
  } catch {
    return null;
  }
}
