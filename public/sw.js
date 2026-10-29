// GTT Live — Service Worker for Offline PWA & Background Push Notifications
const CACHE_NAME = "gtt-live-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Listen for messages from client app (e.g. to trigger alarm notifications in background)
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "TRIGGER_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, {
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [200, 100, 200, 100, 400],
      ...options,
    });
  }
});

// Handle push notification received from server / push service
self.addEventListener("push", (event) => {
  let data = { title: "GTT Live", body: "Il tuo bus si sta avvicinando!" };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 400],
    data: data.url || "/",
    actions: [
      { action: "open", title: "Apri Mappa" },
      { action: "dismiss", title: "Chiudi" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || "GTT Live", options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
