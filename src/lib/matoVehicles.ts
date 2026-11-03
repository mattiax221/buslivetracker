/**
 * Live bus GPS from Muoversi a Torino (5T).
 *
 * GTT's GTFS-RT vehicle_position feed sometimes publishes a valid header
 * and zero vehicles. The same positions still arrive on the public MQTT
 * websocket that the Muoversi map uses: wss://mapi.5t.torino.it/scre
 * topic "/{line}/{fleet}" payload [lat, lon, heading, speedKmh, tripId, dir, nextStop].
 *
 * The socket stays open on the server process so a poll returns the whole
 * fleet, not just the handful of messages that arrived during that request.
 */

import mqtt, { type MqttClient } from "mqtt";
import { isMetro } from "./mapUtils";

const BROKER = "wss://mapi.5t.torino.it/scre";
const ORIGIN = "https://mato.muoversiatorino.it";

/** Drop a fix that has not been refreshed for this long. */
const FRESH_MS = 4 * 60 * 1000;
/** Enough buses to draw the city; the socket then keeps filling in. */
const READY_COUNT = 80;
/** Cold start: wait until the fleet shows up, but stay inside a serverless budget. */
const WAIT_MS = 4500;

export type MatoVehicle = {
  id: string;
  lat: number;
  lon: number;
  heading: number;
  /** km/h. 0 when the feed omits it. */
  speed: number;
  line: string;
  tripId: string;
  fleet: string;
  /** Unix seconds, when we received this fix. */
  fixAt: number;
};

type Stored = MatoVehicle & { seen: number };

type Hub = {
  client: MqttClient | null;
  byId: Map<string, Stored>;
  startedAt: number;
};

function hub(): Hub {
  const g = globalThis as typeof globalThis & { __gttMatoHub?: Hub };
  if (!g.__gttMatoHub) {
    g.__gttMatoHub = { client: null, byId: new Map(), startedAt: 0 };
  }
  return g.__gttMatoHub;
}

/** "2U" / "16CDU" → "2" / "16CD". Same rule as the GTFS-RT route parser. */
export function cleanLine(routeId: string): string {
  let line = routeId.trim();
  if (/([0-9]|CD|CS)[UES]$/i.test(line)) line = line.slice(0, -1);
  return line.replace(/\s+/g, "").trim();
}

export function parseMatoMessage(
  topic: string,
  body: string,
  nowMs: number
): MatoVehicle | null {
  const match = topic.match(/^\/([^/]+)\/([^/]+)$/);
  if (!match) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(body);
  } catch {
    return null;
  }
  if (!Array.isArray(raw) || raw.length < 2) return null;

  const lat = Number(raw[0]);
  const lon = Number(raw[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < 44 || lat > 46 || lon < 6.5 || lon > 9) return null;

  const line = cleanLine(match[1]);
  if (!line || isMetro(line)) return null;

  const fleet = match[2].replace(/[UES]$/i, "").trim();
  const headingRaw = Number(raw[2]);
  const heading =
    Number.isFinite(headingRaw) && headingRaw >= 0 && headingRaw <= 360
      ? headingRaw
      : 0;
  const speedRaw = Number(raw[3]);
  const speed =
    Number.isFinite(speedRaw) && speedRaw >= 0 && speedRaw <= 130
      ? Math.round(speedRaw)
      : 0;

  let tripId = "";
  const tripRaw = raw[4];
  if (tripRaw != null && tripRaw !== "None") {
    const text = String(tripRaw).trim();
    if (text && text !== "None" && text !== "null") {
      tripId = /^\d+$/.test(text) ? `${text}U` : text;
    }
  }

  return {
    id: fleet || `${line}-${match[2]}`,
    lat,
    lon,
    heading,
    speed,
    line,
    tripId,
    fleet,
    fixAt: Math.round(nowMs / 1000),
  };
}

function remember(topic: string, body: Buffer | string): void {
  const now = Date.now();
  const text = typeof body === "string" ? body : body.toString("utf8");
  const vehicle = parseMatoMessage(topic, text, now);
  if (!vehicle) return;
  hub().byId.set(vehicle.id, { ...vehicle, seen: now });
}

function ensureClient(): void {
  const state = hub();
  if (state.client) return;
  const client = mqtt.connect(BROKER, {
    clientId: `gttlive-${Math.random().toString(16).slice(2, 10)}`,
    reconnectPeriod: 4000,
    connectTimeout: 8000,
    wsOptions: {
      headers: { Origin: ORIGIN },
    },
  });
  state.client = client;
  state.startedAt = Date.now();
  client.on("connect", () => {
    client.subscribe("#", { qos: 0 }, (err) => {
      if (err) console.error("MATO MQTT subscribe error:", err.message);
    });
  });
  client.on("message", (topic, payload) => {
    remember(topic, payload);
  });
  client.on("error", (err) => {
    console.error("MATO MQTT error:", err.message);
  });
}

function freshVehicles(now = Date.now()): MatoVehicle[] {
  const state = hub();
  const out: MatoVehicle[] = [];
  for (const [id, vehicle] of state.byId) {
    if (now - vehicle.seen > FRESH_MS) {
      state.byId.delete(id);
      continue;
    }
    out.push({
      id: vehicle.id,
      lat: vehicle.lat,
      lon: vehicle.lon,
      heading: vehicle.heading,
      speed: vehicle.speed,
      line: vehicle.line,
      tripId: vehicle.tripId,
      fleet: vehicle.fleet,
      fixAt: vehicle.fixAt,
    });
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Latest GPS fixes. On a cold process, waits briefly for the fleet to arrive. */
export async function takeMatoVehicles(): Promise<MatoVehicle[]> {
  ensureClient();
  const state = hub();
  const young = Date.now() - state.startedAt < 8000;
  if (young) {
    const deadline = Date.now() + WAIT_MS;
    while (Date.now() < deadline) {
      if (freshVehicles().length >= READY_COUNT) break;
      await sleep(150);
    }
  }
  return freshVehicles();
}
