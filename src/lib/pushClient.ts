import { registerServiceWorker } from "./pwa";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/status");
    const data = await res.json();
    return data.vapidPublicKey || null;
  } catch {
    return null;
  }
}

/** Request notification permission, subscribe, and POST to our backend. */
export async function subscribeDevicePush(
  vapidPublicKey?: string | null
): Promise<{ ok: boolean; endpoint?: string; error?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Solo lato client." };
  }
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { ok: false, error: "Questo browser non supporta le notifiche push." };
  }

  const key = vapidPublicKey ?? (await fetchVapidPublicKey());
  if (!key) {
    return { ok: false, error: "Chiavi VAPID non configurate sul server." };
  }

  const perm =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (perm !== "granted") {
    return { ok: false, error: "Permesso notifiche negato." };
  }

  const reg = await registerServiceWorker();
  if (!reg) {
    return { ok: false, error: "Service worker non disponibile." };
  }
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  }

  const json = sub.toJSON();
  if (!json.endpoint || !json.keys) {
    return { ok: false, error: "Subscription incompleta." };
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || "Registrazione fallita." };
  }
  return { ok: true, endpoint: json.endpoint };
}
