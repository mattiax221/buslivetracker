// Google Maps Transit Router for Turin GTT
// Generates deep-links and navigation queries for Google Maps Transit

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
  path: [number, number][];
}

export interface TripItinerary {
  id: string;
  summary: string;
  totalMinutes: number;
  walkMinutes: number;
  transitMinutes: number;
  transfersCount: number;
  departureTime: string;
  arrivalTime: string;
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

export type TravelMode = "transit" | "walking" | "bicycling" | "driving";

// Generate universal Google Maps Transit Directions URL (opens native app on Android/iOS)
export function getGoogleMapsTransitUrl(
  origin?: { lat?: number; lon?: number; name?: string } | null,
  destination?: { lat?: number; lon?: number; name?: string } | null,
  mode: TravelMode = "transit"
): string {
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("travelmode", mode);

  if (origin && origin.lat && origin.lon) {
    params.set("origin", `${origin.lat.toFixed(6)},${origin.lon.toFixed(6)}`);
  } else if (origin && origin.name) {
    const cleanO = origin.name.replace(/^[📍\s]+/, "").trim();
    params.set("origin", `${cleanO}, Torino`);
  }

  if (destination && destination.lat && destination.lon && destination.name && !destination.name.includes("#")) {
    params.set("destination", `${destination.name}, Torino`);
  } else if (destination && destination.lat && destination.lon) {
    params.set("destination", `${destination.lat.toFixed(6)},${destination.lon.toFixed(6)}`);
  } else if (destination && destination.name) {
    const cleanD = destination.name.replace(/^[📍\s]+/, "").trim();
    params.set("destination", `${cleanD}, Torino`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function planTrip(): TripItinerary[] {
  // Local routing has been replaced by Google Maps Transit navigation,
  // which is 100% accurate, multi-modal, and handles all transfers in Turin.
  return [];
}
