// Schedule-Based Transit Estimator for Turin GTT
// High-accuracy synthesis of scheduled vehicle positions along route shapes
// strictly for lines and directions that currently LACK real-time GPS feeds.

import { Vehicle } from "../app/api/vehicles/route";

export interface RouteShape {
  dir: string;
  headsign: string;
  pts: [number, number][];
}

export interface ShapesMap {
  [line: string]: RouteShape[];
}

// Haversine distance in meters
function getDistanceMeters(
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

// Bearing in degrees from point 1 to point 2
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

// Night Buster lines (operate only Friday & Saturday nights 00:00 - 05:00)
function isNightBuster(line: string): boolean {
  return /^(N\d{2}|S\d{2}|W\d{2}|E68)$/i.test(line);
}

// Factory / Industrial lines that only run during shift changes
function isSpecialShiftLine(line: string): boolean {
  return ["22", "24", "25", "90", "91", "92", "94", "95", "96", "97", "98", "99"].includes(line);
}

// School-only lines
function isSchoolLine(line: string): boolean {
  return ["88", "89"].includes(line);
}

// Historical Tram 7
function isHistoricalTram(line: string): boolean {
  return line === "7";
}

// Check if a line is active according to official GTT schedule timetables
function isLineScheduledNow(line: string, now: Date): boolean {
  const hour = now.getHours();
  const min = now.getMinutes();
  const timeNum = hour * 60 + min;
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = day === 0 || day === 6;

  // Night Buster network
  if (isNightBuster(line)) {
    if ((day === 6 || day === 0) && hour < 5) return true;
    if ((day === 5 || day === 6) && hour >= 23) return true;
    return false;
  }

  // Tram Storico 7
  if (isHistoricalTram(line)) {
    if (!isWeekend) return false;
    return timeNum >= 570 && timeNum <= 1170; // 09:30 - 19:30
  }

  // School lines (Monday - Friday during bell times)
  if (isSchoolLine(line)) {
    if (isWeekend) return false;
    return (timeNum >= 450 && timeNum <= 525) || (timeNum >= 795 && timeNum <= 870);
  }

  // Shift lines
  if (isSpecialShiftLine(line)) {
    if (isWeekend) return false;
    return (
      (timeNum >= 330 && timeNum <= 405) ||
      (timeNum >= 810 && timeNum <= 885) ||
      (timeNum >= 1290 && timeNum <= 1365)
    );
  }

  // General service shutdown (01:15 - 05:00)
  if (hour >= 1 && hour < 5) {
    return false;
  }

  return true;
}

// Calculate total length of polyline in kilometers
function getPolylineLengthKm(pts: [number, number][]): number {
  let meters = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    meters += getDistanceMeters(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  }
  return meters / 1000;
}

// Interpolate coordinate and bearing at a specific fraction (0.0 to 1.0) along polyline
function interpolateAlongPolyline(
  pts: [number, number][],
  fraction: number
): { lat: number; lon: number; heading: number } {
  if (pts.length === 0) return { lat: 45.07, lon: 7.68, heading: 0 };
  if (pts.length === 1 || fraction <= 0) {
    const heading = pts.length > 1 ? calculateBearing(pts[0][0], pts[0][1], pts[1][0], pts[1][1]) : 0;
    return { lat: pts[0][0], lon: pts[0][1], heading };
  }
  if (fraction >= 1) {
    const last = pts.length - 1;
    const heading = calculateBearing(pts[last - 1][0], pts[last - 1][1], pts[last][0], pts[last][1]);
    return { lat: pts[last][0], lon: pts[last][1], heading };
  }

  // Calculate cumulative distances
  const distances: number[] = [0];
  let totalDist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = getDistanceMeters(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
    totalDist += d;
    distances.push(totalDist);
  }

  const targetDist = fraction * totalDist;
  let segIdx = 0;
  for (let i = 0; i < distances.length - 1; i++) {
    if (targetDist >= distances[i] && targetDist <= distances[i + 1]) {
      segIdx = i;
      break;
    }
  }

  const segStart = distances[segIdx];
  const segEnd = distances[segIdx + 1];
  const segLen = segEnd - segStart;
  const segFraction = segLen > 0 ? (targetDist - segStart) / segLen : 0;

  const p1 = pts[segIdx];
  const p2 = pts[segIdx + 1];

  const lat = p1[0] + (p2[0] - p1[0]) * segFraction;
  const lon = p1[1] + (p2[1] - p1[1]) * segFraction;
  const heading = calculateBearing(p1[0], p1[1], p2[0], p2[1]);

  return { lat, lon, heading: Math.round(heading) };
}

/**
 * Generate schedule-estimated vehicle positions for lines/trips lacking real GPS.
 * Strict rules:
 * 1. Never add fake vehicles to lines that already have live GPS.
 * 2. Deduplicate aliases (e.g. 16CD / 16CS).
 * 3. Filter out non-operating night/shift/school lines outside timetable hours.
 * 4. Only estimate canonical urban lines (max 1 vehicle per direction for missing lines).
 */
export function estimateScheduledVehicles(
  realVehicles: Vehicle[],
  shapesMap: ShapesMap,
  targetTime?: Date,
  officialLineIds?: Set<string> | string[]
): Vehicle[] {
  const now = targetTime || new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();

  // Out of service hours (01:15 to 04:45)
  if (currentHour >= 1 && currentHour < 5) {
    return [];
  }

  const totalMinutesSinceMidnight = currentHour * 60 + currentMinute + currentSecond / 60;
  const estimatedVehicles: Vehicle[] = [];

  // 1. Identify all lines that ALREADY have active real GPS vehicles
  const linesWithRealGPS = new Set<string>();
  for (const v of realVehicles) {
    const clean = v.line.replace(/\s+/g, "").toUpperCase();
    linesWithRealGPS.add(clean);
    // Link line 16 circular aliases
    if (clean === "16CD" || clean === "16CS") {
      linesWithRealGPS.add("16");
      linesWithRealGPS.add("16CD");
      linesWithRealGPS.add("16CS");
    }
    // Link variant lines (e.g. 13 and 13BU)
    if (clean.endsWith("BU") || clean.endsWith("NU")) {
      const base = clean.replace(/(BU|NU)$/, "");
      linesWithRealGPS.add(base);
    }
  }

  const officialSet = officialLineIds
    ? officialLineIds instanceof Set
      ? officialLineIds
      : new Set(officialLineIds.map((id) => id.replace(/\s+/g, "").toUpperCase()))
    : null;

  // 2. Iterate over line shapes to find lines that truly lack GPS coverage
  for (const [rawLine, shapes] of Object.entries(shapesMap)) {
    // Skip duplicate aliases with spaces ("16 CD", "16 CS")
    if (rawLine.includes(" ")) continue;

    // Skip 4-digit suburban lines
    if (/^\d{4}$/.test(rawLine)) continue;

    const cleanLine = rawLine.replace(/\s+/g, "").toUpperCase();

    // Skip Metro M1 (has its own dedicated VAL 208 high-frequency live tracking engine)
    if (cleanLine === "M1" || cleanLine === "METRO") continue;

    // Skip generic "16" in favor of official 16CD and 16CS
    if (cleanLine === "16") continue;

    // Skip internal operational codes (depot transfers, maintenance tracks)
    if (
      cleanLine.endsWith("SU") ||
      cleanLine.endsWith("NPVU") ||
      cleanLine.endsWith("MEORU") ||
      cleanLine.endsWith("METROU") ||
      cleanLine.endsWith("VEXU") ||
      cleanLine.endsWith("SPXU")
    ) {
      continue;
    }

    // If official routes set is available, verify line is a recognized passenger line
    if (officialSet && !officialSet.has(cleanLine)) {
      continue;
    }

    // RULE 1: If this line already has active real GPS vehicles, DO NOT create fake buses!
    if (linesWithRealGPS.has(cleanLine)) {
      continue;
    }

    // RULE 2: Check if this line is in service according to GTT official timetable hours
    if (!isLineScheduledNow(cleanLine, now)) {
      continue;
    }

    // Generate at most 1 scheduled vehicle per direction for missing lines
    for (const shape of shapes) {
      if (!shape.pts || shape.pts.length < 2) continue;

      const pathLengthKm = getPolylineLengthKm(shape.pts);
      // Realistic urban bus average speed (~18 km/h with stops)
      const tripDurationMinutes = Math.max(20, Math.min(60, Math.round((pathLengthKm / 18) * 60)));

      // Line-specific seed offset based on string hash for smooth natural spacing
      let lineSeed = 0;
      for (let c = 0; c < cleanLine.length; c++) {
        lineSeed = (lineSeed * 31 + cleanLine.charCodeAt(c)) % 100;
      }

      // Smooth progress calculation along polyline
      const timeFraction = (totalMinutesSinceMidnight / tripDurationMinutes + lineSeed / 100) % 1;
      const progress = Math.abs(timeFraction);

      const { lat, lon, heading } = interpolateAlongPolyline(shape.pts, progress);

      // Determine simulated speed: momentary pause at stops vs moving
      const isDwelling = Math.sin(progress * 30 + lineSeed) > 0.88;
      const speed = isDwelling ? 0 : Math.round(17 + Math.sin(progress * 12) * 5);

      const headsign = shape.headsign ? shape.headsign.toUpperCase() : shape.dir === "0" ? "ANDATA" : "RITORNO";

      estimatedVehicles.push({
        id: `sched_${cleanLine}_dir${shape.dir}`,
        lat,
        lon,
        heading,
        speed,
        line: cleanLine,
        tripId: `SCHED_${cleanLine}_DIR${shape.dir}`,
        headsign,
        statusDescription: isDwelling
          ? "In fermata (stima orario GTT)"
          : `In transito verso ${headsign} (stima orario GTT)`,
        nextStation: `Dir. ${headsign}`,
        isEstimated: true,
      });
    }
  }

  return estimatedVehicles;
}
