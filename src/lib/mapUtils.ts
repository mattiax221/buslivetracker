export const TORINO_CENTER: [number, number] = [45.0703, 7.6869];

/** Greater Turin. Enforced on the map instance so pinch-zoom cannot escape. */
export const TORINO_BOUNDS: [[number, number], [number, number]] = [
  [44.98, 7.52],
  [45.15, 7.79],
];

/** City-scale. Below this the viewport shows half of Piedmont. */
export const TORINO_MIN_ZOOM = 13;

/** How many bus DOM markers to draw. */
export function markerBudget(zoom: number, lineFiltered: boolean): number {
  if (lineFiltered) return 40;
  if (zoom >= 16) return 48;
  if (zoom >= 15) return 32;
  if (zoom >= 14) return 20;
  return 12;
}

export const TRAM_LINES = new Set([
  "3", "3/", "3B",
  "4", "4/", "4B",
  "7",
  "9", "9/", "9B", "9b",
  "10", "10/", "10B",
  "13", "13/",
  "15", "15/",
  "16", "16CD", "16CS", "16 CD", "16 CS",
  "79",
]);

export function normalizeLine(line: string): string {
  return line.replace(/\s+/g, "").toUpperCase();
}

export function expandLineFilter(rawLine: string): string[] {
  const clean = normalizeLine(rawLine);
  if (clean === "16") return ["16CD", "16CS"];
  return [clean];
}

export function isMetro(line: string): boolean {
  const clean = normalizeLine(line);
  return clean === "M1" || clean === "METRO";
}

export function isTram(line: string): boolean {
  if (isMetro(line)) return false;
  const clean = normalizeLine(line);
  if (TRAM_LINES.has(clean) || TRAM_LINES.has(line)) return true;
  if (/^16(CD|CS)?$/i.test(clean)) return true;
  return false;
}

export function lineColor(line: string): string {
  if (isMetro(line)) return "#e11d48";
  if (isTram(line)) return "#dc2626";
  let hash = 0;
  for (let i = 0; i < line.length; i++) {
    hash = line.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 70%, 42%)`;
}

export function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export type ActiveSheet =
  | null
  | "stop"
  | "alerts"
  | "favorites"
  | "metro"
  | "share"
  | "about";

/** Padding so fitBounds / fly targets clear top search + bottom dock on phones. */
export const MAP_CHROME_PAD = {
  top: 140,
  bottom: 130,
  left: 28,
  right: 28,
} as const;

export function mapFitPaddingOptions(maxZoom = 16) {
  return {
    paddingTopLeft: [MAP_CHROME_PAD.left, MAP_CHROME_PAD.top] as [number, number],
    paddingBottomRight: [MAP_CHROME_PAD.right, MAP_CHROME_PAD.bottom] as [
      number,
      number,
    ],
    maxZoom,
  };
}
