const KEY = "gtt.user.location.v1";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 min — still useful for instant map start

export type CachedUserLocation = {
  lat: number;
  lon: number;
  accuracy?: number;
  at: number;
};

export function readCachedUserLocation(
  maxAgeMs = MAX_AGE_MS
): CachedUserLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedUserLocation;
    if (
      !parsed ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lon !== "number" ||
      typeof parsed.at !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.at > maxAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedUserLocation(
  lat: number,
  lon: number,
  accuracy?: number
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CachedUserLocation = {
      lat,
      lon,
      accuracy,
      at: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}
