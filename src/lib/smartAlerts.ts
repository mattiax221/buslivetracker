import { getDistanceMeters, normalizeLine } from "./mapUtils";
import { registerServiceWorker } from "./pwa";

const ENABLED_KEY = "gtt.smartAlerts.enabled";
const COOLDOWN_KEY = "gtt.smartAlerts.cooldown.v1";
const COOLDOWN_MS = 12 * 60 * 1000; // no spam same alert
const ARRIVAL_THRESHOLD_MIN = 4;
const LINE_NEAR_METERS = 450;
const MAX_STOPS_CHECKED = 3;
const MAX_LINES_CHECKED = 5;

export type SmartAlertVehicle = {
  id: string;
  lat: number;
  lon: number;
  line: string;
  isEstimated?: boolean;
};

function readCooldown(): Record<string, number> {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function writeCooldown(map: Record<string, number>): void {
  try {
    // prune old
    const now = Date.now();
    const next: Record<string, number> = {};
    for (const [k, t] of Object.entries(map)) {
      if (now - t < COOLDOWN_MS * 2) next[k] = t;
    }
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function isSmartAlertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSmartAlertsEnabled(on: boolean): void {
  try {
    localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function canNotify(key: string): boolean {
  const map = readCooldown();
  const last = map[key] || 0;
  return Date.now() - last >= COOLDOWN_MS;
}

function markNotified(key: string): void {
  const map = readCooldown();
  map[key] = Date.now();
  writeCooldown(map);
}

async function showLocalNotification(
  title: string,
  body: string,
  url = "/"
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const reg = await registerServiceWorker();
  if (reg && "showNotification" in reg) {
    await reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
      tag: `gtt-${title}-${body}`.slice(0, 64),
    });
    return;
  }
  // fallback
  new Notification(title, { body, icon: "/icon-192.png" });
}

/** Sync prefs to KV so a future cron can alert with app closed. Best-effort. */
export async function syncSmartAlertPrefs(input: {
  lines: string[];
  stops: { code: string; name: string }[];
  enabled: boolean;
}): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys) return;
    await fetch("/api/push/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
        enabled: input.enabled,
        lines: input.lines.slice(0, MAX_LINES_CHECKED),
        stops: input.stops.slice(0, MAX_STOPS_CHECKED),
      }),
    });
  } catch {
    /* ignore network */
  }
}

/**
 * Light client check — uses in-memory vehicles + at most 3 stop arrival fetches.
 * Safe for phones: capped work, cooldowns, no big JSON.
 */
export async function runSmartAlertCheck(input: {
  lines: string[];
  stops: { code: string; name: string }[];
  userCoords: [number, number] | null;
  vehicles: SmartAlertVehicle[];
}): Promise<void> {
  if (!isSmartAlertsEnabled()) return;
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const lines = input.lines.slice(0, MAX_LINES_CHECKED);
  const stops = input.stops.slice(0, MAX_STOPS_CHECKED);

  // 1) Favorite stops — next arrival soon
  for (const stop of stops) {
    const key = `stop:${stop.code}`;
    if (!canNotify(key)) continue;
    try {
      const res = await fetch(`/api/stops/arrivals?stop=${encodeURIComponent(stop.code)}`);
      if (!res.ok) continue;
      const data = await res.json();
      const arrivals = Array.isArray(data.arrivals) ? data.arrivals : [];
      const soon = arrivals.find(
        (a: { minutesRemaining?: number; line?: string; realtime?: boolean }) =>
          typeof a.minutesRemaining === "number" &&
          a.minutesRemaining >= 0 &&
          a.minutesRemaining <= ARRIVAL_THRESHOLD_MIN
      );
      if (soon) {
        markNotified(key);
        await showLocalNotification(
          `Fermata ${stop.name}`,
          `Linea ${soon.line}: ${
            soon.minutesRemaining <= 0
              ? "in arrivo"
              : `tra ${soon.minutesRemaining} min`
          }`,
          `/?stop=${stop.code}`
        );
      }
    } catch {
      /* ignore */
    }
  }

  // 2) Favorite lines near the user (GPS vehicles only)
  if (!input.userCoords || lines.length === 0) return;
  const [ulat, ulon] = input.userCoords;
  const want = new Set(lines.map(normalizeLine));

  for (const v of input.vehicles) {
    if (v.isEstimated) continue;
    const line = normalizeLine(v.line);
    if (!want.has(line) && !(want.has("16") && (line === "16CD" || line === "16CS"))) {
      continue;
    }
    const key = `line:${line}`;
    if (!canNotify(key)) continue;
    const d = getDistanceMeters(ulat, ulon, v.lat, v.lon);
    if (d <= LINE_NEAR_METERS) {
      markNotified(key);
      await showLocalNotification(
        `Linea ${v.line} vicino`,
        `Un mezzo è a circa ${Math.round(d)} m da te`,
        `/?line=${encodeURIComponent(v.line)}`
      );
      break; // one line alert per cycle
    }
  }
}
