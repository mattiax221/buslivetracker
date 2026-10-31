import { NextResponse } from "next/server";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { getMetroVehicles } from "../../../lib/metroEngine";

const VEHICLE_POSITIONS_URL =
  "https://percorsieorari.gtt.to.it/das_gtfsrt/vehicle_position.aspx";
const TRIP_UPDATES_URL =
  "https://percorsieorari.gtt.to.it/das_gtfsrt/trip_update.aspx";

const Wheelchair =
  GtfsRealtimeBindings.transit_realtime.VehicleDescriptor.WheelchairAccessible;

/** Trip-update index is stable enough to reuse across the 3s position polls. */
const TRIP_CACHE_MS = 15_000;

type TripLive = {
  delaySec?: number;
  wheelchair?: "yes" | "no";
};

let tripCache: { at: number; index: Map<string, TripLive> } | null = null;

export interface Vehicle {
  id: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  line: string;
  tripId: string;
  /** GTT fleet number from the live feed (matricola). */
  fleet?: string;
  headsign?: string;
  statusDescription?: string;
  nextStation?: string;
  isEstimated?: boolean;
  isSimulated?: boolean;
  /** Unix seconds of this vehicle's GPS fix. */
  fixAt?: number;
  /** Seconds vs the timetable. Negative means early. Present only when GTT sends it. */
  delaySec?: number;
  /** From the trip-update feed. Omitted when GTT sends no value. */
  wheelchair?: "yes" | "no";
}

function asFinite(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  ) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Protobuf defaults unset numbers to 0, so only an own property counts. */
function ownNumber(obj: object | null | undefined, key: string): number | undefined {
  if (!obj || !Object.prototype.hasOwnProperty.call(obj, key)) return undefined;
  return asFinite((obj as Record<string, unknown>)[key]);
}

function readStopDelay(stop: {
  arrival?: object | null;
  departure?: object | null;
}): number | undefined {
  return ownNumber(stop.arrival, "delay") ?? ownNumber(stop.departure, "delay");
}

function indexTripUpdates(feed: {
  entity: Array<{
    tripUpdate?: {
      trip?: { tripId?: string | null } | null;
      vehicle?: { wheelchairAccessible?: number | null } | null;
      stopTimeUpdate?: Array<{
        arrival?: object | null;
        departure?: object | null;
      }> | null;
    } | null;
  }>;
}): Map<string, TripLive> {
  const index = new Map<string, TripLive>();
  for (const entity of feed.entity) {
    const trip = entity.tripUpdate;
    const tripId = trip?.trip?.tripId;
    if (!trip || !tripId) continue;

    let delaySec: number | undefined;
    for (const stop of trip.stopTimeUpdate ?? []) {
      const delay = readStopDelay(stop);
      if (delay != null) {
        delaySec = delay;
        break;
      }
    }

    const access = trip.vehicle?.wheelchairAccessible;
    let wheelchair: "yes" | "no" | undefined;
    if (access === Wheelchair.WHEELCHAIR_ACCESSIBLE) wheelchair = "yes";
    else if (access === Wheelchair.WHEELCHAIR_INACCESSIBLE) wheelchair = "no";

    if (delaySec == null && !wheelchair) continue;
    const live: TripLive = {};
    if (delaySec != null) live.delaySec = Math.round(delaySec);
    if (wheelchair) live.wheelchair = wheelchair;
    index.set(tripId, live);
  }
  return index;
}

async function loadTripIndex(): Promise<Map<string, TripLive>> {
  const now = Date.now();
  if (tripCache && now - tripCache.at < TRIP_CACHE_MS) return tripCache.index;
  try {
    const res = await fetch(TRIP_UPDATES_URL, { cache: "no-store" });
    if (!res.ok) return tripCache?.index ?? new Map();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(await res.arrayBuffer())
    );
    const index = indexTripUpdates(feed);
    tripCache = { at: now, index };
    return index;
  } catch (err) {
    console.error("Trip update fetch error:", err);
    return tripCache?.index ?? new Map();
  }
}

export async function GET() {
  try {
    const tripsPromise = loadTripIndex();
    const res = await fetch(VEHICLE_POSITIONS_URL, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "GTT GTFS-RT feed error", status: res.status },
        { status: 502 }
      );
    }

    const buffer = await res.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    const trips = await tripsPromise;
    const vehicles: Vehicle[] = [];

    for (const entity of feed.entity) {
      const vp = entity.vehicle;
      if (!vp?.position?.latitude || !vp?.position?.longitude) continue;

      const routeId = vp.trip?.routeId ?? "";
      // GTT route IDs: "2U", "16CDU", "16CSU", "110E"
      // Strip trailing bacino U/E/S only if preceded by digits or CD/CS
      let line = routeId.trim();
      if (/([0-9]|CD|CS)[UES]$/i.test(line)) {
        line = line.slice(0, -1);
      }
      line = line.replace(/\s+/g, "").trim() || routeId;

      const tripId = vp.trip?.tripId ?? "";
      const live = tripId ? trips.get(tripId) : undefined;
      const fixAt = asFinite(vp.timestamp);

      vehicles.push({
        id: entity.id ?? vp.vehicle?.id ?? `${vp.position.latitude}-${vp.position.longitude}`,
        lat: vp.position.latitude,
        lon: vp.position.longitude,
        heading: vp.position.bearing ?? 0,
        speed: vp.position.speed
          ? Math.round(vp.position.speed * 3.6) // m/s → km/h
          : 0,
        line: line || "?",
        tripId,
        fleet: (vp.vehicle?.label || vp.vehicle?.id || entity.id || "")
          .replace(/[UES]$/i, "")
          .trim(),
        ...(fixAt != null && fixAt > 1_000_000_000
          ? { fixAt: Math.round(fixAt) }
          : {}),
        ...(live?.delaySec != null ? { delaySec: live.delaySec } : {}),
        ...(live?.wheelchair ? { wheelchair: live.wheelchair } : {}),
      });
    }

    // Inject high-precision VAL 208 Metro M1 real-time train positions
    try {
      const metroTrains = getMetroVehicles();
      vehicles.push(...metroTrains);
    } catch (metroErr) {
      console.error("Error generating metro vehicles:", metroErr);
    }

    return NextResponse.json({
      vehicles,
      count: vehicles.length,
      timestamp: new Date().toISOString(),
      feedTimestamp: feed.header?.timestamp
        ? new Date(Number(feed.header.timestamp) * 1000).toISOString()
        : null,
    });
  } catch (err: any) {
    console.error("Vehicle fetch error:", err);
    return NextResponse.json(
      { error: "Failed to parse GTFS-RT feed", message: err.message },
      { status: 500 }
    );
  }
}
