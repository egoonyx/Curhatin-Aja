// Zoom Server-to-Server OAuth helper.
// Requires ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET env vars
// (from a Server-to-Server OAuth app in the Zoom App Marketplace).
// If any of these are missing, callers should gracefully skip the Zoom
// link and still let the meeting be scheduled internally.

const ZOOM_BASE = "https://api.zoom.us/v2";

export function isZoomConfigured() {
  return Boolean(
    process.env.ZOOM_ACCOUNT_ID &&
      process.env.ZOOM_CLIENT_ID &&
      process.env.ZOOM_CLIENT_SECRET
  );
}

async function getZoomAccessToken(): Promise<string | null> {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const res = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: "POST",
        headers: { Authorization: `Basic ${basic}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function deleteZoomMeeting(zoomMeetingId: string): Promise<boolean> {
  const token = await getZoomAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`${ZOOM_BASE}/meetings/${zoomMeetingId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // Zoom returns 204 on success; treat "already gone" (404) as success too.
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

export async function createZoomMeeting({
  topic,
  startTime,
  durationMinutes,
  agenda,
}: {
  topic: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
  agenda?: string | null;
}): Promise<{ joinUrl: string; startUrl: string; meetingId: string } | null> {
  const token = await getZoomAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${ZOOM_BASE}/users/me/meetings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic,
        type: 2,
        start_time: startTime,
        duration: durationMinutes,
        agenda: agenda || undefined,
        settings: {
          join_before_host: true,
          waiting_room: false,
        },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      joinUrl: data.join_url,
      startUrl: data.start_url,
      meetingId: String(data.id),
    };
  } catch {
    return null;
  }
}
