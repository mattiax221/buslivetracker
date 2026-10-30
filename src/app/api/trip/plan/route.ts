import { NextRequest, NextResponse } from "next/server";
import type { TripItinerary, TripLeg } from "../../../../lib/tripPlan";
import { decodePolyline } from "../../../../lib/polyline";

const OTP_BASE = "https://plan.muoversiatorino.it/otp/routers/mato/plan";

function asNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function mapLeg(raw: Record<string, unknown>): TripLeg {
  const from = (raw.from || {}) as Record<string, unknown>;
  const to = (raw.to || {}) as Record<string, unknown>;
  const route =
    String(raw.routeShortName || raw.route || "").trim() ||
    (raw.transitLeg ? "?" : "");
  const geom = (raw.legGeometry || {}) as { points?: string };
  const points = decodePolyline(String(geom.points || ""));
  return {
    mode: String(raw.mode || "WALK"),
    route,
    headsign: String(raw.headsign || ""),
    fromName: String(from.name || ""),
    toName: String(to.name || ""),
    startTime: asNum(raw.startTime),
    endTime: asNum(raw.endTime),
    durationSec: asNum(raw.duration),
    distanceM: asNum(raw.distance),
    transit: Boolean(raw.transitLeg),
    points,
  };
}

function mapItinerary(raw: Record<string, unknown>): TripItinerary {
  const legsRaw = Array.isArray(raw.legs) ? raw.legs : [];
  return {
    durationSec: asNum(raw.duration),
    startTime: asNum(raw.startTime),
    endTime: asNum(raw.endTime),
    walkDistanceM: asNum(raw.walkDistance),
    transfers: asNum(raw.transfers),
    legs: legsRaw.map((l) => mapLeg(l as Record<string, unknown>)),
  };
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const fromLat = Number(sp.get("fromLat"));
  const fromLon = Number(sp.get("fromLon"));
  const toLat = Number(sp.get("toLat"));
  const toLon = Number(sp.get("toLon"));
  const time = sp.get("time") || "";
  const date = sp.get("date") || "";
  const arriveBy = sp.get("arriveBy") === "true";

  if (
    ![fromLat, fromLon, toLat, toLon].every((n) => Number.isFinite(n)) ||
    Math.abs(fromLat) > 90 ||
    Math.abs(toLat) > 90 ||
    Math.abs(fromLon) > 180 ||
    Math.abs(toLon) > 180
  ) {
    return NextResponse.json({ error: "Coordinate non valide" }, { status: 400 });
  }

  // Bound to Torino-ish box to avoid abuse
  const inTorino = (lat: number, lon: number) =>
    lat > 44.8 && lat < 45.3 && lon > 7.3 && lon < 8.1;
  if (!inTorino(fromLat, fromLon) || !inTorino(toLat, toLon)) {
    return NextResponse.json(
      { error: "Percorso fuori dall’area di Torino" },
      { status: 400 }
    );
  }

  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const otpDate = date || `${mm}-${dd}-${yyyy}`;
  const otpTime =
    time && /^\d{1,2}:\d{2}$/.test(time)
      ? time
      : `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const url = new URL(OTP_BASE);
  url.searchParams.set("fromPlace", `${fromLat},${fromLon}`);
  url.searchParams.set("toPlace", `${toLat},${toLon}`);
  url.searchParams.set("date", otpDate);
  url.searchParams.set("time", otpTime);
  url.searchParams.set("mode", "TRANSIT,WALK");
  url.searchParams.set("arriveBy", arriveBy ? "true" : "false");
  url.searchParams.set("numItineraries", "4");
  url.searchParams.set("maxWalkDistance", "1500");
  url.searchParams.set("locale", "it");

  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Motore percorsi non disponibile (${res.status})` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as {
      error?: { msg?: string };
      plan?: { itineraries?: Record<string, unknown>[] };
    };
    if (data.error?.msg) {
      return NextResponse.json({ error: data.error.msg }, { status: 422 });
    }
    const list = data.plan?.itineraries || [];
    const itineraries = list.map(mapItinerary).sort(
      (a, b) => a.durationSec - b.durationSec || a.startTime - b.startTime
    );
    return NextResponse.json({
      ok: true,
      date: otpDate,
      time: otpTime,
      itineraries,
      source: "muoversiatorino",
    });
  } catch (err) {
    console.warn("trip plan failed", err);
    return NextResponse.json(
      { error: "Impossibile calcolare il percorso" },
      { status: 502 }
    );
  }
}
