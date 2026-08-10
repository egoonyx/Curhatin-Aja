// Unified notification dispatch: looks up each target profile's
// notify_push / notify_email preference and sends through whichever
// channel(s) they've opted into.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPushToProfiles } from "@/lib/push";
import { sendEmail, isEmailConfigured } from "@/lib/email";

type NotifyPayload = { title: string; body: string; url?: string };

export async function notifyProfiles(
  supabase: SupabaseClient,
  profileIds: string[],
  payload: NotifyPayload
): Promise<void> {
  if (profileIds.length === 0) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, notify_push, notify_email")
    .in("id", profileIds);

  if (error || !data) return;

  const rows = data as {
    id: string;
    email: string;
    full_name: string;
    notify_push: boolean;
    notify_email: boolean;
  }[];

  const pushIds = rows.filter((r) => r.notify_push).map((r) => r.id);
  const emailRows = rows.filter((r) => r.notify_email && r.email);

  await Promise.all([
    sendPushToProfiles(supabase, pushIds, payload),
    isEmailConfigured()
      ? Promise.all(
          emailRows.map((r) =>
            sendEmail({
              to: r.email,
              subject: payload.title,
              html: `
                <p>${payload.body}</p>
                ${
                  payload.url
                    ? `<p><a href="https://app.curhatingroup.id${payload.url}">Open in Curhatin Aja</a></p>`
                    : ""
                }
                <p style="color:#94a3b8;font-size:12px;">
                  You're getting this because email notifications are turned on in your
                  Curhatin Aja profile. You can turn this off anytime from your Profile page.
                </p>
              `,
            })
          )
        )
      : Promise.resolve(),
  ]);
}
