/** Lightweight recent lines/stops — localStorage only, tiny JSON. */

const KEY = "gtt.recent.v1";
const MAX = 8;

export type RecentStop = { code: string; name: string };

export type RecentHistory = {
  lines: string[];
  stops: RecentStop[];
};

function read(): RecentHistory {
  if (typeof window === "undefined") return { lines: [], stops: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { lines: [], stops: [] };
    const parsed = JSON.parse(raw) as RecentHistory;
    return {
      lines: Array.isArray(parsed.lines) ? parsed.lines.slice(0, MAX) : [],
      stops: Array.isArray(parsed.stops) ? parsed.stops.slice(0, MAX) : [],
    };
  } catch {
    return { lines: [], stops: [] };
  }
}

function write(next: RecentHistory): void {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        lines: next.lines.slice(0, MAX),
        stops: next.stops.slice(0, MAX),
      })
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

export function getRecentHistory(): RecentHistory {
  return read();
}

export function pushRecentLine(line: string): RecentHistory {
  const clean = line.trim();
  if (!clean) return read();
  const prev = read();
  const lines = [clean, ...prev.lines.filter((l) => l !== clean)].slice(0, MAX);
  const next = { ...prev, lines };
  write(next);
  return next;
}

export function pushRecentStop(stop: RecentStop): RecentHistory {
  if (!stop.code) return read();
  const prev = read();
  const stops = [
    stop,
    ...prev.stops.filter((s) => s.code !== stop.code),
  ].slice(0, MAX);
  const next = { ...prev, stops };
  write(next);
  return next;
}
