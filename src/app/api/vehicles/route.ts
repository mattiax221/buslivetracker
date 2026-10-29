import { NextResponse } from "next/server";
import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import { getMetroVehicles } from "../../../lib/metroEngine";

const VEHICLE_POSITIONS_URL =
  "https://percorsieorari.gtt.to.it/das_gtfsrt/vehicle_position.aspx";

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
  isEstimated?: boolean;
}

export async function GET() {
  try {
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

      vehicles.push({
        id: entity.id ?? vp.vehicle?.id ?? `${vp.position.latitude}-${vp.position.longitude}`,
        lat: vp.position.latitude,
        lon: vp.position.longitude,
        heading: vp.position.bearing ?? 0,
        speed: vp.position.speed
          ? Math.round(vp.position.speed * 3.6) // m/s → km/h
          : 0,
        line: line || "?",
        tripId: vp.trip?.tripId ?? "",
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
