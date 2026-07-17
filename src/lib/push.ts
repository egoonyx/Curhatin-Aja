// Web Push helper. Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and
// VAPID_SUBJECT (a mailto: address or URL) env vars - generate a keypair
// with `npx web-push generate-vapid-keys`. If any of these are missing,
// callers should gracefully skip sending (same pattern as isZoomConfigured()
// in src/lib/zoom.ts).
//
// This does NOT use the Supabase service-role key. Subscriptions belonging
// to other profiles are read via the get_push_subscriptions_for(uuid[])
// security-definer RPC (see supabase/schema.sql), called with whichever
// signed-in user's session triggered the notification.

import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

export function isPushConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT
  );
}

type PushSubscriptionRow = {
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendPushToProfiles(
  supabase: SupabaseClient,
  profileIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!isPushConfigured() || profileIds.length === 0) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const { data, error } = await supabase.rpc("get_push_subscriptions_for", {
    target_ids: profileIds,
  });
  if (error || !data) return;

  const subscriptions = data as PushSubscriptionRow[];
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: unknown) {
        // 404/410 = the subscription is gone (browser data cleared, permission
        // revoked, etc.) - clean it up so we stop trying to push to it.
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    })
  );
}
