/**
 * GPS approach alerts: notify when a live vehicle is closing in on a watched stop.
 * Light: max 2 stops, distance deltas only, no shapes/network JSON.
 */

import { getDistanceMeters, normalizeLine } from "./mapUtils";
import { registerServiceWorker } from "./pwa";

const WATCH_KEY = "gtt.gpsWatch.v1";
const COOLDOWN_KEY = "gtt.gpsWatch.cooldown.v1";
const COOLDOWN_MS = 10 * 60 * 1000;
const APPROACH_M = 200;
const CLOSE_DELTA_M = 28;
const AT_STOP_M = 45;
const DWELL_SPEED = 1.8;

export type WatchedStop = {
  code: string;
  name: string;
  lat: number;
  lon: number;
  /** If set, only these lines count (from arrivals when enabled). */
  lines?: string[];
};

type Track = { dist: number; at: number };

const tracks = new Map<string, Track>();

function readWatches(): WatchedStop[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as WatchedStop[];
    return Array.isArray(list) ? list.slice(0, 2) : [];
  } catch {
    return [];
  }
}

function writeWatches(list: WatchedStop[]): void {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(list.slice(0, 2)));
  } catch {
    /* ignore */
  }
}

export function getWatchedStops(): WatchedStop[] {
  if (typeof window === "undefined") return [];
  return readWatches();
}

export function isStopWatched(code: string): boolean {
  return readWatches().some((w) => w.code === code);
}

export function unwatchStop(code: string): void {
  writeWatches(readWatches().filter((w) => w.code !== code));
}

/** Max 2 watched stops. Replaces oldest if full. */
export function watchStop(stop: WatchedStop): WatchedStop[] {
  const prev = readWatches().filter((w) => w.code !== stop.code);
  const next = [stop, ...prev].slice(0, 2);
  writeWatches(next);
  return next;
}

function canFire(key: string): boolean {
  try {
    const map = JSON.parse(localStorage.getItem(COOLDOWN_KEY) || "{}") as Record<
      string,
      number
    >;
    return Date.now() - (map[key] || 0) >= COOLDOWN_MS;
  } catch {
    return true;
  }
}

function markFired(key: string): void {
  try {
    const map = JSON.parse(localStorage.getItem(COOLDOWN_KEY) || "{}") as Record<
      string,
      number
    >;
    map[key] = Date.now();
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

async function notify(title: string, body: string, url: string): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  const reg = await registerServiceWorker();
  if (reg?.showNotification) {
    await reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url },
      tag: `gps-stop-${url}`,
    });
    return;
  }
  new Notification(title, { body, icon: "/icon-192.png" });
}

export type GpsVehicle = {
  id: string;
  lat: number;
  lon: number;
  line: string;
  speed: number;
  isEstimated?: boolean;
  isSimulated?: boolean;
};

/**
 * Call on each vehicle poll. Cheap O(vehicles × watchedStops≤2).
 */
export async function checkGpsApproachToWatchedStops(
  vehicles: GpsVehicle[]
): Promise<void> {
  if (typeof window === "undefined") return;
  const watches = readWatches();
  if (watches.length === 0) return;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const now = Date.now();

  for (const stop of watches) {
    const lineSet =
      stop.lines && stop.lines.length > 0
        ? new Set(stop.lines.map(normalizeLine))
        : null;

    for (const v of vehicles) {
      if (v.isEstimated || v.isSimulated) continue;
      const line = normalizeLine(v.line);
      if (lineSet && !lineSet.has(line)) {
        if (!(lineSet.has("16") && (line === "16CD" || line === "16CS"))) {
          continue;
        }
      }

      const dist = getDistanceMeters(v.lat, v.lon, stop.lat, stop.lon);
      const tKey = `${v.id}:${stop.code}`;
      const prev = tracks.get(tKey);

      tracks.set(tKey, { dist, at: now });

      // Capolinea / già fermo in fermata: niente spam
      if (dist <= AT_STOP_M && (v.speed || 0) <= DWELL_SPEED) continue;
      if (prev && prev.dist <= AT_STOP_M) continue;

      // Serve un avvicinamento chiaro
      if (!prev) continue;
      if (now - prev.at > 90_000) continue; // track troppo vecchio
      if (dist > APPROACH_M) continue;

      const closing = prev.dist - dist;
      const moving = (v.speed || 0) > DWELL_SPEED || closing >= CLOSE_DELTA_M;
      if (!moving || closing < CLOSE_DELTA_M) continue;

      const coolKey = `watch:${stop.code}:${line}`;
      if (!canFire(coolKey)) continue;

      markFired(coolKey);
      await notify(
        `Linea ${v.line} in avvicinamento`,
        `Sta arrivando a ${stop.name} (GPS ~${Math.round(dist)} m)`,
        `/?stop=${encodeURIComponent(stop.code)}`
      );
      return; // one notification per tick
    }
  }

  // prune stale tracks
  for (const [k, t] of tracks) {
    if (now - t.at > 120_000) tracks.delete(k);
  }
}
