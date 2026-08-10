"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type Status = "checking" | "unsupported" | "off" | "on" | "denied";

export default function PushNotificationToggle({
  currentUserId,
  initialNotifyEmail,
}: {
  currentUserId: string;
  /** Whether this person currently has email notifications turned on. */
  initialNotifyEmail: boolean;
}) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notifyEmail, setNotifyEmail] = useState(initialNotifyEmail);
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const existing = await registration.pushManager.getSubscription();
        setStatus(existing ? "on" : "off");
      } catch {
        setStatus("off");
      }
    }
    check();
  }, []);

  async function handleEnable() {
    setBusy(true);
    setError(null);
    try {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Push notifications aren't configured yet - ask an admin to finish setup.");
        setBusy(false);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        setBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const supabase = createClient();
      const { error: insertError } = await supabase.from("push_subscriptions").upsert(
        {
          profile_id: currentUserId,
          endpoint: json.endpoint!,
          p256dh: json.keys!.p256dh,
          auth: json.keys!.auth,
        },
        { onConflict: "endpoint" }
      );

      if (insertError) {
        setError(insertError.message);
        setBusy(false);
        return;
      }

      await supabase.from("profiles").update({ notify_push: true }).eq("id", currentUserId);
      setStatus("on");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable notifications.");
    }
    setBusy(false);
  }

  async function handleDisable() {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        const supabase = createClient();
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
        await supabase.from("profiles").update({ notify_push: false }).eq("id", currentUserId);
      }
      setStatus("off");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable notifications.");
    }
    setBusy(false);
  }

  async function handleToggleEmail() {
    const next = !notifyEmail;
    setNotifyEmail(next);
    setEmailBusy(true);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ notify_email: next })
      .eq("id", currentUserId);
    if (updateError) {
      setNotifyEmail(!next);
      setError(updateError.message);
    }
    setEmailBusy(false);
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 text-sm font-semibold text-slate-700">Notifications</h2>
      <p className="mb-3 text-sm text-slate-500">
        Get notified about new messages, task assignments, and meeting invites - choose phone
        push, email, both, or neither.
      </p>

      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Phone / browser push
          </p>

          {status === "checking" && <p className="text-sm text-slate-400">Checking...</p>}

          {status === "unsupported" && (
            <p className="text-sm text-slate-400">
              Your browser doesn&apos;t support push notifications. On iPhone, add this site to
              your Home Screen first (Share → Add to Home Screen), then try again from there.
            </p>
          )}

          {status === "denied" && (
            <p className="text-sm text-amber-600">
              Notifications are blocked for this site in your browser settings. Enable them from
              your browser&apos;s site settings to turn this on.
            </p>
          )}

          {status === "off" && (
            <button onClick={handleEnable} disabled={busy} className="btn-primary text-sm">
              {busy ? "Enabling..." : "Enable phone notifications"}
            </button>
          )}

          {status === "on" && (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                Enabled on this device
              </span>
              <button
                onClick={handleDisable}
                disabled={busy}
                className="text-xs font-medium text-slate-400 hover:text-red-500"
              >
                {busy ? "Disabling..." : "Turn off"}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-sky-50 pt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
            Email
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={notifyEmail}
              disabled={emailBusy}
              onChange={handleToggleEmail}
            />
            Also email me for the same updates
          </label>
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
