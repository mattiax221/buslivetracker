// Google Maps-Style Transit Trip Planner for Turin
// Multi-modal: Walking + Bus + Tram + Metro M1 with live GTFS-RT vehicle integration

export interface TripPoint {
  lat: number;
  lon: number;
  name: string;
}

export interface TripLeg {
  type: "WALK" | "TRANSIT";
  mode?: "BUS" | "TRAM" | "METRO";
  line?: string;
  headsign?: string;
  fromName: string;
  fromCode?: string;
  toName: string;
  toCode?: string;
  durationMinutes: number;
  distanceMeters: number;
  stopsCount?: number;
  intermediateStops?: { code: string; name: string }[];
  path: [number, number][]; // coordinates for Leaflet polyline
  liveVehicle?: {
    id: string;
    line: string;
    etaMinutes: number;
  };
}

export interface TripItinerary {
  id: string;
  summary: string; // e.g. "Tram 4 → Metro M1" or "Linea 16 CD"
  totalMinutes: number;
  walkMinutes: number;
  transitMinutes: number;
  transfersCount: number;
  departureTime: string; // e.g. "18:25"
  arrivalTime: string;   // e.g. "18:43"
  legs: TripLeg[];
  isFastest?: boolean;
  isLeastWalk?: boolean;
}

export interface StopItem {
  c: string; // code
  n: string; // name
  d?: string;
  lat: number;
  lon: number;
}

export interface TransitNetworkData {
  patterns: Record<
    string,
    { line: string; dir: string; headsign: string; stops: string[] }
  >;
  stopLines: Record<string, string[]>;
  metroStations: { code: string; name: string; lat: number; lon: number }[];
}

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

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

const TRAM_SET = new Set([
  "3", "3/", "3B", "4", "4/", "4B", "7", "9", "9/", "9B",
  "10", "10/", "10B", "13", "13/", "15", "15/", "16", "16CD", "16CS", "79"
]);

function getLineMode(line: string): "METRO" | "TRAM" | "BUS" {
  const clean = line.replace(/\s+/g, "").toUpperCase();
  if (clean === "M1" || clean === "METRO") return "METRO";
  if (TRAM_SET.has(clean) || /^16(CD|CS)?$/i.test(clean)) return "TRAM";
  return "BUS";
}

export function planTrip(
  origin: TripPoint,
  destination: TripPoint,
  allStops: StopItem[],
  network: TransitNetworkData,
  lineShapes: Record<string, { dir: string; headsign: string; pts: [number, number][] }[]>,
  liveVehicles?: { id: string; line: string; lat: number; lon: number }[]
): TripItinerary[] {
  const directDistance = getDistanceMeters(origin.lat, origin.lon, destination.lat, destination.lon);
  const itineraries: TripItinerary[] = [];
  const now = new Date();

  // Create stop map for quick coordinate and name lookup
  const stopMap = new Map<string, StopItem>();
  for (const s of allStops) {
    stopMap.set(s.c, s);
  }
  // Also index metro stations
  for (const m of network.metroStations) {
    stopMap.set(m.code, { c: m.code, n: m.name, lat: m.lat, lon: m.lon });
  }

  // 1. Direct Walking Option
  const walkSpeedMPerMin = 75; // 4.5 km/h
  const totalWalkMin = Math.max(1, Math.round(directDistance / walkSpeedMPerMin));

  if (directDistance <= 1600) {
    const arrDate = new Date(now.getTime() + totalWalkMin * 60000);
    itineraries.push({
      id: "walk-direct",
      summary: "A piedi",
      totalMinutes: totalWalkMin,
      walkMinutes: totalWalkMin,
      transitMinutes: 0,
      transfersCount: 0,
      departureTime: formatTime(now),
      arrivalTime: formatTime(arrDate),
      legs: [
        {
          type: "WALK",
          fromName: origin.name,
          toName: destination.name,
          durationMinutes: totalWalkMin,
          distanceMeters: directDistance,
          path: [
            [origin.lat, origin.lon],
            [destination.lat, destination.lon],
          ],
        },
      ],
    });
  }

  // Find candidate origin stops within 650m
  const originCandidates = allStops
    .concat(network.metroStations.map((m) => ({ c: m.code, n: m.name, lat: m.lat, lon: m.lon })))
    .map((s) => ({
      stop: s,
      dist: getDistanceMeters(origin.lat, origin.lon, s.lat, s.lon),
    }))
    .filter((s) => s.dist <= 650)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 16);

  // Find candidate destination stops within 650m
  const destCandidates = allStops
    .concat(network.metroStations.map((m) => ({ c: m.code, n: m.name, lat: m.lat, lon: m.lon })))
    .map((s) => ({
      stop: s,
      dist: getDistanceMeters(destination.lat, destination.lon, s.lat, s.lon),
    }))
    .filter((s) => s.dist <= 650)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 16);

  // 2. Direct Routes (Single Line / Metro)
  const seenDirectLines = new Set<string>();

  for (const oCandidate of originCandidates) {
    const oLines = network.stopLines[oCandidate.stop.c] || [];
    for (const dCandidate of destCandidates) {
      if (oCandidate.stop.c === dCandidate.stop.c) continue;
      const dLines = network.stopLines[dCandidate.stop.c] || [];

      // Intersect lines
      const commonLines = oLines.filter((l) => dLines.includes(l));
      for (const line of commonLines) {
        if (seenDirectLines.has(line)) continue;

        // Verify that this line moves from oCandidate to dCandidate in that order
        let bestPattern: { dir: string; headsign: string; stops: string[] } | null = null;
        let oIdx = -1;
        let dIdx = -1;

        for (const [key, pat] of Object.entries(network.patterns)) {
          if (pat.line === line) {
            const idx1 = pat.stops.indexOf(oCandidate.stop.c);
            const idx2 = pat.stops.indexOf(dCandidate.stop.c);
            if (idx1 !== -1 && idx2 !== -1 && idx2 > idx1) {
              bestPattern = pat;
              oIdx = idx1;
              dIdx = idx2;
              break;
            }
          }
        }

        if (bestPattern && oIdx !== -1 && dIdx !== -1) {
          seenDirectLines.add(line);
          const stopCount = dIdx - oIdx;
          const mode = getLineMode(line);
          const minPerStop = mode === "METRO" ? 1.2 : mode === "TRAM" ? 1.6 : 1.9;
          const transitMin = Math.max(2, Math.round(stopCount * minPerStop));

          const walkToStopMin = Math.max(1, Math.round(oCandidate.dist / walkSpeedMPerMin));
          const walkFromStopMin = Math.max(1, Math.round(dCandidate.dist / walkSpeedMPerMin));

          // Check live vehicles for wait time
          let waitMin = 4; // default expected frequency
          let matchedLiveVehicle: { id: string; line: string; etaMinutes: number } | undefined;
          if (liveVehicles) {
            const approaching = liveVehicles.filter(
              (v) => v.line === line || v.line.replace(/\s+/g, "") === line
            );
            if (approaching.length > 0) {
              // Find vehicle closest to boarding stop
              const vDist = getDistanceMeters(
                approaching[0].lat,
                approaching[0].lon,
                oCandidate.stop.lat,
                oCandidate.stop.lon
              );
              waitMin = Math.max(1, Math.min(12, Math.round(vDist / 350)));
              matchedLiveVehicle = {
                id: approaching[0].id,
                line,
                etaMinutes: waitMin,
              };
            }
          }

          const totalTripMin = walkToStopMin + waitMin + transitMin + walkFromStopMin;
          const arrDate = new Date(now.getTime() + totalTripMin * 60000);

          // Get intermediate stops
          const intermediate: { code: string; name: string }[] = [];
          for (let i = oIdx; i <= dIdx; i++) {
            const sCode = bestPattern.stops[i];
            const sObj = stopMap.get(sCode);
            if (sObj) {
              intermediate.push({ code: sCode, name: sObj.n });
            }
          }

          // Generate polyline path
          const transitPath: [number, number][] = intermediate.map((s) => {
            const sObj = stopMap.get(s.code)!;
            return [sObj.lat, sObj.lon];
          });

          itineraries.push({
            id: `direct-${line}-${oCandidate.stop.c}-${dCandidate.stop.c}`,
            summary: mode === "METRO" ? "Metro M1" : `Linea ${line}`,
            totalMinutes: totalTripMin,
            walkMinutes: walkToStopMin + walkFromStopMin,
            transitMinutes: transitMin,
            transfersCount: 0,
            departureTime: formatTime(now),
            arrivalTime: formatTime(arrDate),
            legs: [
              {
                type: "WALK",
                fromName: origin.name,
                toName: oCandidate.stop.n,
                toCode: oCandidate.stop.c,
                durationMinutes: walkToStopMin,
                distanceMeters: oCandidate.dist,
                path: [
                  [origin.lat, origin.lon],
                  [oCandidate.stop.lat, oCandidate.stop.lon],
                ],
              },
              {
                type: "TRANSIT",
                mode,
                line,
                headsign: bestPattern.headsign,
                fromName: oCandidate.stop.n,
                fromCode: oCandidate.stop.c,
                toName: dCandidate.stop.n,
                toCode: dCandidate.stop.c,
                durationMinutes: transitMin,
                distanceMeters: Math.round(stopCount * 380),
                stopsCount: stopCount,
                intermediateStops: intermediate,
                path: transitPath,
                liveVehicle: matchedLiveVehicle,
              },
              {
                type: "WALK",
                fromName: dCandidate.stop.n,
                fromCode: dCandidate.stop.c,
                toName: destination.name,
                durationMinutes: walkFromStopMin,
                distanceMeters: dCandidate.dist,
                path: [
                  [dCandidate.stop.lat, dCandidate.stop.lon],
                  [destination.lat, destination.lon],
                ],
              },
            ],
          });
        }
      }
    }
  }

  // 3. 1-Transfer Routes (e.g. Line A -> Metro M1, or Line A -> Line B at major hubs like Porta Nuova, Porta Susa, Vinzaglio)
  if (itineraries.filter((it) => it.transfersCount === 0 && it.legs.length > 1).length < 3) {
    const HUB_STOP_CODES = [
      "METRO_PORTA_NUOVA",
      "METRO_PORTA_SUSA",
      "METRO_VINZAGLIO",
      "METRO_BERNINI",
      "METRO_XVIII_DICEMBRE",
      "39",   // PORTA NUOVA FS
      "27",   // PORTA SUSA FS
      "1298", // CASTELLO
      "254",  // VITTORIO EMANUELE
    ];

    for (const hubCode of HUB_STOP_CODES) {
      const hubStop = stopMap.get(hubCode);
      if (!hubStop) continue;

      const hubLines = network.stopLines[hubCode] || [];

      // Find first leg from origin to hub
      for (const oCand of originCandidates.slice(0, 6)) {
        const oLines = (network.stopLines[oCand.stop.c] || []).filter((l) => hubLines.includes(l));
        if (oLines.length === 0) continue;
        const line1 = oLines[0];

        // Find second leg from hub to destination
        for (const dCand of destCandidates.slice(0, 6)) {
          const dLines = (network.stopLines[dCand.stop.c] || []).filter(
            (l) => hubLines.includes(l) && l !== line1
          );
          if (dLines.length === 0) continue;
          const line2 = dLines[0];

          const mode1 = getLineMode(line1);
          const mode2 = getLineMode(line2);

          const walkToStopMin = Math.max(1, Math.round(oCand.dist / walkSpeedMPerMin));
          const transit1Min = Math.max(3, Math.round(mode1 === "METRO" ? 6 : 9));
          const transferWaitMin = 3;
          const transit2Min = Math.max(3, Math.round(mode2 === "METRO" ? 6 : 9));
          const walkFromStopMin = Math.max(1, Math.round(dCand.dist / walkSpeedMPerMin));

          const totalMin =
            walkToStopMin + transit1Min + transferWaitMin + transit2Min + walkFromStopMin;
          const arrDate = new Date(now.getTime() + totalMin * 60000);

          itineraries.push({
            id: `transfer-${line1}-${line2}-${hubCode}`,
            summary: `${mode1 === "METRO" ? "Metro M1" : line1} + ${mode2 === "METRO" ? "Metro M1" : line2}`,
            totalMinutes: totalMin,
            walkMinutes: walkToStopMin + walkFromStopMin + 2,
            transitMinutes: transit1Min + transit2Min,
            transfersCount: 1,
            departureTime: formatTime(now),
            arrivalTime: formatTime(arrDate),
            legs: [
              {
                type: "WALK",
                fromName: origin.name,
                toName: oCand.stop.n,
                durationMinutes: walkToStopMin,
                distanceMeters: oCand.dist,
                path: [
                  [origin.lat, origin.lon],
                  [oCand.stop.lat, oCand.stop.lon],
                ],
              },
              {
                type: "TRANSIT",
                mode: mode1,
                line: line1,
                fromName: oCand.stop.n,
                toName: hubStop.n,
                durationMinutes: transit1Min,
                distanceMeters: 1800,
                stopsCount: 4,
                path: [
                  [oCand.stop.lat, oCand.stop.lon],
                  [hubStop.lat, hubStop.lon],
                ],
              },
              {
                type: "WALK",
                fromName: hubStop.n,
                toName: `Cambio: ${hubStop.n}`,
                durationMinutes: transferWaitMin,
                distanceMeters: 50,
                path: [
                  [hubStop.lat, hubStop.lon],
                  [hubStop.lat + 0.0001, hubStop.lon + 0.0001],
                ],
              },
              {
                type: "TRANSIT",
                mode: mode2,
                line: line2,
                fromName: hubStop.n,
                toName: dCand.stop.n,
                durationMinutes: transit2Min,
                distanceMeters: 1800,
                stopsCount: 4,
                path: [
                  [hubStop.lat, hubStop.lon],
                  [dCand.stop.lat, dCand.stop.lon],
                ],
              },
              {
                type: "WALK",
                fromName: dCand.stop.n,
                toName: destination.name,
                durationMinutes: walkFromStopMin,
                distanceMeters: dCand.dist,
                path: [
                  [dCand.stop.lat, dCand.stop.lon],
                  [destination.lat, destination.lon],
                ],
              },
            ],
          });
          break; // 1 combination per hub is plenty
        }
      }
    }
  }

  // Sort itineraries by total minutes
  itineraries.sort((a, b) => a.totalMinutes - b.totalMinutes);

  // Mark badges (Fastest, Least Walk)
  if (itineraries.length > 0) {
    itineraries[0].isFastest = true;
    let minWalk = Infinity;
    let leastWalkIt: TripItinerary | null = null;
    for (const it of itineraries) {
      if (it.walkMinutes < minWalk) {
        minWalk = it.walkMinutes;
        leastWalkIt = it;
      }
    }
    if (leastWalkIt && leastWalkIt !== itineraries[0]) {
      leastWalkIt.isLeastWalk = true;
    }
  }

  return itineraries.slice(0, 5);
}
