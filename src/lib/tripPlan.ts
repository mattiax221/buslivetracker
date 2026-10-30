/** Slim types for Mato OTP itineraries + saved shortcuts. */

export type TripPlace = {
  name: string;
  lat: number;
  lon: number;
  /** GTT stop code when known */
  code?: string;
};

export type TripLeg = {
  mode: string;
  route: string;
  headsign: string;
  fromName: string;
  toName: string;
  startTime: number;
  endTime: number;
  durationSec: number;
  distanceM: number;
  transit: boolean;
  /** Decoded lat/lon path for map guidance */
  points: [number, number][];
};

export type TripItinerary = {
  durationSec: number;
  startTime: number;
  endTime: number;
  walkDistanceM: number;
  transfers: number;
  legs: TripLeg[];
};

export type TripShortcut = {
  id: string;
  name: string;
  from: TripPlace;
  to: TripPlace;
  /** HH:MM preferred departure; empty = use “now” when opened */
  departTime: string;
  createdAt: number;
};

const SHORTCUTS_KEY = "gtt.tripShortcuts.v1";
const MAX_SHORTCUTS = 6;

export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h} h ${rem} min` : `${h} h`;
}

export function getTripShortcuts(): TripShortcut[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as TripShortcut[];
    return Array.isArray(list) ? list.slice(0, MAX_SHORTCUTS) : [];
  } catch {
    return [];
  }
}

export function saveTripShortcut(
  input: Omit<TripShortcut, "id" | "createdAt"> & { id?: string }
): TripShortcut[] {
  const nextItem: TripShortcut = {
    id: input.id || `ts-${Date.now()}`,
    name: input.name.trim() || `${input.from.name} → ${input.to.name}`,
    from: input.from,
    to: input.to,
    departTime: input.departTime || "",
    createdAt: Date.now(),
  };
  const prev = getTripShortcuts().filter((s) => s.id !== nextItem.id);
  const next = [nextItem, ...prev].slice(0, MAX_SHORTCUTS);
  try {
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function removeTripShortcut(id: string): TripShortcut[] {
  const next = getTripShortcuts().filter((s) => s.id !== id);
  try {
    localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function defaultDepartTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Clean OTP route labels like "58/" → usable line ids. */
export function cleanTripRoute(route: string): string {
  return route.replace(/\/+$/, "").replace(/\s+/g, "").toUpperCase();
}

export function itineraryTransitLines(it: TripItinerary): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const leg of it.legs) {
    if (!leg.transit || !leg.route) continue;
    const clean = cleanTripRoute(leg.route);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

export function itineraryAllPoints(it: TripItinerary): [number, number][] {
  const pts: [number, number][] = [];
  for (const leg of it.legs) {
    for (const p of leg.points) pts.push(p);
  }
  return pts;
}
