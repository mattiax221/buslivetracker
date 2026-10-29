// Schedule-Based Transit Estimator for Turin GTT
// Synthesizes scheduled vehicle positions along route shapes for lines/trips lacking real-time GPS feeds

import { Vehicle } from "../app/api/vehicles/route";

interface RouteShape {
  dir: string;
  headsign: string;
  pts: [number, number][];
}

interface ShapesMap {
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

// High-frequency trunk lines in Turin
const HIGH_FREQ_LINES = new Set([
  "3", "4", "9", "10", "13", "15", "16CD", "16CS", "18", "2", "55", "56", "68", "72", "14"
]);

// Determine daytime/evening headway in minutes
function getLineHeadwayMinutes(line: string, hour: number): number {
  const isTrunk = HIGH_FREQ_LINES.has(line.replace(/\s+/g, "").toUpperCase());

  // Rush hours (07:00 - 09:30, 16:30 - 19:30)
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
  // Evening / Night (20:00 - 01:00)
  const isNight = hour >= 20 || hour < 6;

  if (isTrunk) {
    if (isRush) return 7;
    if (isNight) return 16;
    return 9; // Normal daytime
  }

  // Standard urban lines
  if (isRush) return 11;
  if (isNight) return 22;
  return 14;
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
 * Performs spatial deduplication against existing real GPS vehicles to avoid duplicates.
 */
export function estimateScheduledVehicles(
  realVehicles: Vehicle[],
  shapesMap: ShapesMap,
  targetTime?: Date
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

  // Group real vehicles by line to quickly check coverage
  const realVehiclesByLine = new Map<string, Vehicle[]>();
  for (const v of realVehicles) {
    const cleanLine = v.line.replace(/\s+/g, "").toUpperCase();
    if (!realVehiclesByLine.has(cleanLine)) {
      realVehiclesByLine.set(cleanLine, []);
    }
    realVehiclesByLine.get(cleanLine)!.push(v);
  }

  // Iterate over line shapes to find lines or directions that need estimation
  for (const [rawLine, shapes] of Object.entries(shapesMap)) {
    // Skip Metro M1 since it has its own dedicated VAL 208 live tracking engine
    const cleanLine = rawLine.replace(/\s+/g, "").toUpperCase();
    if (cleanLine === "M1" || cleanLine === "METRO") continue;

    const realOnLine = realVehiclesByLine.get(cleanLine) || [];
    const headway = getLineHeadwayMinutes(cleanLine, currentHour);

    for (const shape of shapes) {
      if (!shape.pts || shape.pts.length < 2) continue;

      const pathLengthKm = getPolylineLengthKm(shape.pts);
      // Average urban transit speed ~18 km/h including stops
      const averageSpeedKmH = 18;
      const tripDurationMinutes = Math.max(16, Math.min(80, Math.round((pathLengthKm / averageSpeedKmH) * 60)));

      // Number of scheduled vehicles operating on this direction
      const scheduledCount = Math.max(1, Math.min(8, Math.round(tripDurationMinutes / headway)));

      // Generate positions for each scheduled vehicle slot
      for (let slot = 0; slot < scheduledCount; slot++) {
        // Line-specific seed offset based on string hash for realistic phase spacing
        let lineSeed = 0;
        for (let c = 0; c < cleanLine.length; c++) {
          lineSeed = (lineSeed * 31 + cleanLine.charCodeAt(c)) % 100;
        }

        const slotPhase = slot / scheduledCount;
        const timeFraction = (totalMinutesSinceMidnight / tripDurationMinutes + slotPhase + lineSeed / 100) % 1;
        const progress = Math.abs(timeFraction);

        const { lat, lon, heading } = interpolateAlongPolyline(shape.pts, progress);

        // Deduplication: Check if there is ALREADY a real GPS vehicle close to this estimated position (within 1300m)
        const hasRealNearby = realOnLine.some((rv) => {
          const dist = getDistanceMeters(rv.lat, rv.lon, lat, lon);
          return dist < 1300;
        });

        if (hasRealNearby) {
          // Real GPS vehicle already covers this slot
          continue;
        }

        // Determine simulated speed: momentary pause at stops vs moving
        const isDwelling = Math.sin(progress * 40 + slot) > 0.85;
        const speed = isDwelling ? 0 : Math.round(16 + Math.sin(progress * 15) * 6);

        const headsign = shape.headsign ? shape.headsign.toUpperCase() : shape.dir === "0" ? "ANDATA" : "RITORNO";

        estimatedVehicles.push({
          id: `sched_${cleanLine}_${shape.dir}_slot${slot}`,
          lat,
          lon,
          heading,
          speed,
          line: cleanLine,
          tripId: `SCHED_${cleanLine}_DIR${shape.dir}`,
          headsign,
          statusDescription: isDwelling
            ? "In fermata (stima orari)"
            : `In transito verso ${headsign} (stima)`,
          nextStation: `Dir. ${headsign}`,
          isEstimated: true,
        });
      }
    }
  }

  return estimatedVehicles;
}
