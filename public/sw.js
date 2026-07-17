// Service worker for Curhatin Aja web push notifications.
// Kept intentionally tiny - this app is not a full offline-first PWA,
// this file only exists to receive push events and handle notification
// clicks (both require a service worker per the Push API spec).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Curhatin Aja", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Curhatin Aja";
  const options = {
    body: data.body || "",
    icon: "/logo-transparent.png",
    badge: "/logo-transparent.png",
    data: { url: data.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
