/**
 * GTT Live Torino — Metro M1 timetable simulation (VAL 208)
 *
 * Underground GPS is unavailable. This module approximates train positions
 * from a headway/timetable model for map visualization only — it is NOT
 * live ATC telemetry or official GTT real-time metro tracking.
 */

export interface Vehicle {
  id: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  line: string;
  tripId: string;
  headsign?: string;
  statusDescription?: string;
  nextStation?: string;
  /** Timetable simulation — not live GPS / ATC telemetry */
  isSimulated?: boolean;
}

export interface MetroStation {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

export const METRO_STATIONS: MetroStation[] = [
  { code: "8210", name: "Fermi", lat: 45.07605, lon: 7.59139 },
  { code: "8211", name: "Paradiso", lat: 45.07391, lon: 7.6021 },
  { code: "8212", name: "Marche", lat: 45.07432, lon: 7.61456 },
  { code: "8213", name: "Massaua", lat: 45.07457, lon: 7.62013 },
  { code: "8214", name: "Pozzo Strada", lat: 45.07493, lon: 7.62893 },
  { code: "8215", name: "Monte Grappa", lat: 45.07521, lon: 7.63559 },
  { code: "8216", name: "Rivoli", lat: 45.07553, lon: 7.64394 },
  { code: "8217", name: "Racconigi", lat: 45.0757, lon: 7.64826 },
  { code: "8218", name: "Bernini", lat: 45.07601, lon: 7.65568 },
  { code: "8219", name: "Principi d'Acaja", lat: 45.07637, lon: 7.66446 },
  { code: "8220", name: "XVIII Dicembre", lat: 45.07377, lon: 7.66805 },
  { code: "8221", name: "Porta Susa", lat: 45.06987, lon: 7.66477 },
  { code: "8222", name: "Vinzaglio", lat: 45.06731, lon: 7.66622 },
  { code: "8223", name: "Re Umberto", lat: 45.06453, lon: 7.67403 },
  { code: "8224", name: "Porta Nuova", lat: 45.06276, lon: 7.679 },
  { code: "8225", name: "Marconi", lat: 45.05713, lon: 7.67693 },
  { code: "8226", name: "Nizza", lat: 45.0514, lon: 7.67465 },
  { code: "8227", name: "Dante", lat: 45.0469, lon: 7.67289 },
  { code: "8228", name: "Carducci-Molinette", lat: 45.0423, lon: 7.67112 },
  { code: "8229", name: "Spezia", lat: 45.03768, lon: 7.66933 },
  { code: "8230", name: "Lingotto", lat: 45.03077, lon: 7.66661 },
  { code: "8232", name: "Italia '61", lat: 45.02476, lon: 7.66433 },
  { code: "8233", name: "Bengasi", lat: 45.01663, lon: 7.66122 },
];

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

interface StationSchedule {
  stationIdx: number;
  arrTime: number;
  depTime: number;
}

interface PrecomputedPlan {
  schedule: StationSchedule[];
  dists: number[];
  stops: MetroStation[];
}

function buildSchedule(stops: MetroStation[]): PrecomputedPlan {
  const DWELL = 20; // 20s station dwell time
  const TOTAL_DURATION = 1560; // 26 minutes end-to-end
  const TOTAL_DWELL = DWELL * (stops.length - 2);
  const RUNNING_BUDGET = TOTAL_DURATION - TOTAL_DWELL;

  const dists: number[] = [];
  let totalM = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    const d = haversine(stops[i].lat, stops[i].lon, stops[i + 1].lat, stops[i + 1].lon);
    dists.push(d);
    totalM += d;
  }

  const schedule: StationSchedule[] = [{ stationIdx: 0, arrTime: 0, depTime: 0 }];
  let curTime = 0;
  for (let i = 0; i < dists.length; i++) {
    const runTime = Math.round(RUNNING_BUDGET * (dists[i] / totalM));
    curTime += runTime;
    const isLast = i === dists.length - 1;
    const depTime = isLast ? curTime : curTime + DWELL;
    schedule.push({ stationIdx: i + 1, arrTime: curTime, depTime });
    curTime = depTime;
  }

  return { schedule, dists, stops };
}

const forwardPlan = buildSchedule(METRO_STATIONS);
const backwardPlan = buildSchedule([...METRO_STATIONS].reverse());

function getRomeTime(d: Date = new Date()): {
  hour: number;
  minute: number;
  weekday: string;
  isOpen: boolean;
  headwaySeconds: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Rome",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);

  let hour = 0;
  let minute = 0;
  let weekday = "Mon";
  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
    if (p.type === "weekday") weekday = p.value;
  }
  if (hour === 24) hour = 0;

  const timeDec = hour + minute / 60;
  let isOpen = false;

  // Operating hours
  if (weekday === "Sun") {
    // Sunday: 07:00 - 22:00
    isOpen = timeDec >= 7.0 && timeDec <= 22.0;
  } else if (weekday === "Fri" || weekday === "Sat") {
    // Fri & Sat: 05:30 - 01:30
    isOpen = timeDec >= 5.5 || timeDec < 1.5;
  } else {
    // Mon - Thu: 05:30 - 22:00
    isOpen = timeDec >= 5.5 && timeDec <= 22.0;
  }

  // Headway (intervals)
  let headwaySeconds = 240; // default 4 min
  if (
    weekday !== "Sun" &&
    ((timeDec >= 7.0 && timeDec <= 9.3) || (timeDec >= 16.5 && timeDec <= 19.5))
  ) {
    headwaySeconds = 180; // 3 min peak rush
  } else if (timeDec >= 20.5 || timeDec < 6.5) {
    headwaySeconds = 420; // 7 min evening/early morning
  } else if (weekday === "Sun") {
    headwaySeconds = 300; // 5 min Sunday
  }

  return { hour, minute, weekday, isOpen, headwaySeconds };
}

/**
 * Returns the array of active real-time Metro M1 trains
 */
export function getMetroVehicles(date: Date = new Date()): Vehicle[] {
  const { isOpen, headwaySeconds } = getRomeTime(date);
  if (!isOpen) return [];

  const nowSec = Math.floor(date.getTime() / 1000);
  const TOTAL_DURATION = 1560; // 26 minutes
  const vehicles: Vehicle[] = [];

  // Direction: Bengasi (dir 1, Fermi -> Bengasi) and Fermi (dir 0, Bengasi -> Fermi)
  const directions = [
    { isFwd: true, plan: forwardPlan, headsign: "METRO BENGASI", dirPrefix: "M1-BEN", stagger: 0 },
    { isFwd: false, plan: backwardPlan, headsign: "METRO FERMI", dirPrefix: "M1-FER", stagger: 90 },
  ];

  for (const { isFwd, plan, headsign, dirPrefix, stagger } of directions) {
    const baseT = Math.floor(nowSec / headwaySeconds) * headwaySeconds + stagger;
    const maxK = Math.ceil(TOTAL_DURATION / headwaySeconds) + 2;

    for (let k = -maxK; k <= 1; k++) {
      const depTime = baseT + k * headwaySeconds;
      const elapsed = nowSec - depTime;

      if (elapsed >= 0 && elapsed <= TOTAL_DURATION) {
        const state = interpolateTrain(elapsed, plan, isFwd, headsign);
        if (state) {
          const trainNum = Math.abs((Math.floor(depTime / headwaySeconds) % 30) + 1);
          vehicles.push({
            id: `${dirPrefix}-${trainNum.toString().padStart(2, "0")}`,
            lat: state.lat,
            lon: state.lon,
            heading: state.heading,
            speed: state.speed,
            line: "M1",
            tripId: `M1-${headsign.includes("BENGASI") ? "DIR1" : "DIR0"}-${trainNum}`,
            headsign: state.headsign,
            statusDescription: state.statusDescription,
            nextStation: state.nextStation,
            isSimulated: true,
          });
        }
      }
    }
  }

  return vehicles;
}

function interpolateTrain(
  elapsed: number,
  plan: PrecomputedPlan,
  isFwd: boolean,
  headsign: string
): {
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  headsign: string;
  statusDescription: string;
  nextStation: string;
} | null {
  const { schedule, dists, stops } = plan;

  for (let i = 0; i < schedule.length; i++) {
    const st = schedule[i];

    // Dwelling at station i
    if (elapsed >= st.arrTime && elapsed <= st.depTime) {
      const curStop = stops[st.stationIdx];
      const nextStop = stops[st.stationIdx + 1] || stops[st.stationIdx];
      const bearing = getBearing(curStop.lat, curStop.lon, nextStop.lat, nextStop.lon);

      return {
        lat: curStop.lat,
        lon: curStop.lon,
        speed: 0,
        heading: bearing,
        headsign,
        statusDescription: `In sosta a ${curStop.name}`,
        nextStation: nextStop.name,
      };
    }

    // Moving between station i and i+1
    if (i < schedule.length - 1) {
      const nextSt = schedule[i + 1];
      if (elapsed > st.depTime && elapsed < nextSt.arrTime) {
        const segDuration = nextSt.arrTime - st.depTime;
        const segElapsed = elapsed - st.depTime;
        const alpha = Math.min(Math.max(segElapsed / segDuration, 0), 1);

        const curStop = stops[st.stationIdx];
        const nextStop = stops[nextSt.stationIdx];

        const lat = curStop.lat + alpha * (nextStop.lat - curStop.lat);
        const lon = curStop.lon + alpha * (nextStop.lon - curStop.lon);
        const bearing = getBearing(curStop.lat, curStop.lon, nextStop.lat, nextStop.lon);
        const speed = Math.round((dists[i] / segDuration) * 3.6);

        return {
          lat: Number(lat.toFixed(5)),
          lon: Number(lon.toFixed(5)),
          speed,
          heading: bearing,
          headsign,
          statusDescription: `In transito verso ${nextStop.name}`,
          nextStation: nextStop.name,
        };
      }
    }
  }

  return null;
}

