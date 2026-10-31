"use client";

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
  Fragment,
  memo,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Bus,
  TramFront as Tram,
  Clock,
  TrainTrack,
  Share2,
} from "lucide-react";
import StopsLayer, { StopData } from "./StopsLayer";
import StopBottomSheet from "./StopBottomSheet";
import AlertsBottomSheet from "./AlertsBottomSheet";
import FavoritesSheet from "./FavoritesSheet";
import MetroAccessibilitySheet from "./MetroAccessibilitySheet";
import ShareModal from "./ShareModal";
import AboutPrivacySheet from "./AboutPrivacySheet";
import TripPlannerSheet from "./TripPlannerSheet";
import TripGuidanceBanner from "./TripGuidanceBanner";
import MapTopChrome from "./MapTopChrome";
import MapSearchPanel from "./MapSearchPanel";
import MapContextBanner from "./MapContextBanner";
import MapBottomDock from "./MapBottomDock";
import SheetHost from "./SheetHost";
import { ShareData } from "../lib/shareUtils";
import {
  itineraryAllPoints,
  itineraryTransitLines,
  type TripItinerary,
  type TripPlace,
} from "../lib/tripPlan";
import { estimateScheduledVehicles } from "../lib/scheduleEstimator";
import { registerServiceWorker } from "../lib/pwa";
import { METRO_M1_ACCESSIBILITY } from "../lib/metroAccessibility";
import {
  ActiveSheet,
  MAP_CHROME_PAD,
  TORINO_CENTER,
  TORINO_SOFT_BOUNDS,
  expandLineFilter,
  getDistanceMeters,
  isMetro,
  isTram,
  lineColor,
  mapFitPaddingOptions,
  naturalSort,
  normalizeLine,
} from "../lib/mapUtils";
import {
  readCachedUserLocation,
  writeCachedUserLocation,
} from "../lib/userLocationCache";
import { pushRecentLine, pushRecentStop } from "../lib/recentHistory";
import SmartAlertsRunner from "./SmartAlertsRunner";
import {
  applyPollUpdate,
  sampleAt,
  tickMotions,
  type VehicleMotionState,
} from "../lib/vehicleMotion";
import { lookupFleet } from "../lib/fleet";

/* ── Types ── */
interface Vehicle {
  id: string;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  line: string;
  tripId: string;
  fleet?: string;
  headsign?: string;
  statusDescription?: string;
  nextStation?: string;
  isEstimated?: boolean;
  isSimulated?: boolean;
}

interface ApiResponse {
  vehicles: Vehicle[];
  count: number;
  timestamp: string;
  feedTimestamp: string | null;
}

interface StopInfo {
  code: string;
  name: string;
  desc?: string;
  lat: number;
  lon: number;
}

interface OfficialRoute {
  id: string;
  name: string;
  longName: string;
  isTram: boolean;
}

interface RouteShape {
  dir: string;
  headsign: string;
  pts: [number, number][];
}

/** Visible tab: max reactivity vs GTT feed. Hidden: save battery. */
const REFRESH_MS_VISIBLE = 3_000;
const REFRESH_MS_HIDDEN = 15_000;
/** Motion tick ~12fps — light, not every paint. */
const MOTION_TICK_MS = 80;

/* Approximate metro station coords for fly-to (name match against stops.json) */
const METRO_FOCUS_FALLBACK: Record<string, [number, number]> = {
  METRO_FERMI: [45.0742, 7.6015],
  METRO_BENGASI: [45.0328, 7.6665],
};

const vehicleIconCache = new Map<string, L.DivIcon>();

function getVehicleIcon(
  line: string,
  heading: number,
  isEstimated?: boolean,
  isStopped?: boolean
): L.DivIcon {
  const roundedRot = Math.round((heading || 0) / 12) * 12;
  const key = `${line}_${roundedRot}_${isEstimated ? "est" : "real"}_${isStopped ? "stop" : "go"}`;
  let icon = vehicleIconCache.get(key);
  if (!icon) {
    const color = lineColor(line);
    const borderStyle = isEstimated
      ? "2px dashed #fbbf24"
      : "2px solid rgba(255,255,255,0.95)";
    const opacity = isEstimated ? "0.94" : "1";
    const shadow = isEstimated
      ? "0 2px 8px rgba(245,158,11,0.45)"
      : "0 2px 8px rgba(15,23,42,0.35)";
    const arrowOpacity = isStopped ? "0.35" : "1";

    icon = L.divIcon({
      className: "bus-marker",
      html: `
        <div class="bus-marker-container" style="transform: translate(-50%, -50%); cursor: pointer; opacity: ${opacity};">
          <div class="bus-arrow" style="transform: rotate(${roundedRot}deg); opacity: ${arrowOpacity};">
            <svg width="12" height="12" viewBox="0 0 12 12" style="position:absolute;top:-10px;left:50%;transform:translateX(-50%); filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));">
              <polygon points="6,0 10,10 6,7 2,10" fill="${color}"/>
            </svg>
          </div>
          <div class="bus-badge" style="
            background: ${color}; color: white; font-size: 11px; font-weight: 800;
            padding: 3px 7px; border-radius: 8px; white-space: nowrap;
            box-shadow: ${shadow}; border: ${borderStyle}; min-width: 26px;
            text-align: center; line-height: 1.15; display: flex; align-items: center;
            justify-content: center; gap: 3px; letter-spacing: 0.02em;
          ">
            ${isEstimated ? `<span style="font-size:9px;opacity:0.95">⏱</span>` : ""}
            <span>${line}</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    vehicleIconCache.set(key, icon);
  }
  return icon;
}

function getVehicleDirection(v: Vehicle, shapes: RouteShape[]): string | null {
  if (!shapes || shapes.length === 0) return null;
  if (shapes.length === 1) return shapes[0].dir;

  if (isMetro(v.line)) {
    if (v.headsign?.includes("FERMI") || v.tripId?.includes("DIR0")) return "0";
    if (v.headsign?.includes("BENGASI") || v.tripId?.includes("DIR1")) return "1";
  }

  if (v.headsign) {
    const cleanH = v.headsign.toLowerCase();
    const matched = shapes.find(
      (s) => s.headsign && s.headsign.toLowerCase().includes(cleanH)
    );
    if (matched) return matched.dir;
  }

  let bestDir = shapes[0].dir;
  let minDistance = Infinity;
  for (const shape of shapes) {
    for (let i = 0; i < shape.pts.length; i++) {
      const pt = shape.pts[i];
      const d = getDistanceMeters(v.lat, v.lon, pt[0], pt[1]);
      if (d < minDistance) {
        minDistance = d;
        bestDir = shape.dir;
      }
    }
  }
  return bestDir;
}

function FleetLine({ fleet }: { fleet: string }) {
  const info = lookupFleet(fleet);
  if (!info) return null;
  return (
    <div className="mt-1.5 text-[11px] leading-snug">
      {info.photo && (
        <figure className="mb-1.5 -mx-1">
          <img
            src={info.photo.src}
            alt={info.name || `Matricola ${info.fleet}`}
            className="w-full h-28 object-cover rounded-lg bg-slate-100"
            loading="lazy"
          />
          <figcaption className="mt-0.5 text-[9px] text-slate-400">
            Foto {info.photo.author} · {info.photo.license}
          </figcaption>
        </figure>
      )}
      <div className="font-bold text-slate-800">Matricola {info.fleet}</div>
      {info.name ? (
        <div className="text-slate-600">
          {info.name}
          {info.detail ? ` · ${info.detail}` : ""}
        </div>
      ) : (
        <div className="text-slate-400">Serie non in archivio</div>
      )}
    </div>
  );
}

/**
 * GPS dots use calibrated / glided coords from vehicleMotion.
 * Compact mode = CircleMarker (light) so hundreds of GPS buses don't OOM Android.
 */
const VehicleMarkerItem = memo(function VehicleMarkerItem({
  vehicle,
  detailOpen,
  compact,
  onSelectVehicle,
  onFitRoute,
  onShareVehicle,
}: {
  vehicle: Vehicle;
  detailOpen: boolean;
  compact: boolean;
  onSelectVehicle?: (v: Vehicle) => void;
  onFitRoute?: (line: string) => void;
  onShareVehicle?: (v: Vehicle) => void;
}) {
  const metro = isMetro(vehicle.line);
  const tram = !metro && isTram(vehicle.line);
  const markerRef = useRef<L.Marker | null>(null);
  const color = lineColor(vehicle.line);
  const icon = getVehicleIcon(
    vehicle.line,
    vehicle.heading,
    vehicle.isEstimated,
    vehicle.speed <= 1.8
  );

  useEffect(() => {
    if (detailOpen) markerRef.current?.openPopup();
  }, [detailOpen]);

  // Light dots when zoomed out — same GPS fleet, fraction of the DOM cost
  if (compact && !detailOpen) {
    return (
      <CircleMarker
        center={[vehicle.lat, vehicle.lon]}
        radius={vehicle.isEstimated ? 5 : 6}
        pathOptions={{
          color: "#fff",
          weight: 1,
          fillColor: color,
          fillOpacity: vehicle.isEstimated ? 0.55 : 0.92,
        }}
        eventHandlers={{ click: () => onSelectVehicle?.(vehicle) }}
      />
    );
  }

  return (
    <Marker
      ref={markerRef as unknown as React.Ref<L.Marker>}
      position={[vehicle.lat, vehicle.lon]}
      icon={icon}
      eventHandlers={{ click: () => onSelectVehicle?.(vehicle) }}
    >
      {detailOpen && (
      <Popup>
        <div className="text-sm min-w-[190px] p-1 font-sans">
          <div className="font-bold text-base text-slate-900 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              {metro ? (
                <TrainTrack className="w-4 h-4 text-rose-600" />
              ) : tram ? (
                <Tram className="w-4 h-4 text-red-600" />
              ) : (
                <Bus className="w-4 h-4 text-[#0B5FFF]" />
              )}
              <span>{metro ? "Metro M1" : `Linea ${vehicle.line}`}</span>
            </div>
            {vehicle.isEstimated ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                Stimato
              </span>
            ) : vehicle.isSimulated || metro ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                Simulata
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                Live GPS
              </span>
            )}
          </div>

          {vehicle.headsign && (
            <div className="text-xs font-semibold text-slate-700 mt-1">
              <span className="text-slate-400">Direzione: </span>
              {vehicle.headsign}
            </div>
          )}

          {vehicle.fleet && !vehicle.isEstimated && !vehicle.isSimulated && !metro && (
            <FleetLine fleet={vehicle.fleet} />
          )}

          {vehicle.isEstimated ? (
            <div className="text-[11px] font-medium text-amber-800 bg-amber-50 p-2 rounded-xl mt-1.5 border border-amber-200">
              <div className="flex items-center gap-1 font-bold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Posizione stimata da orari (senza GPS)
              </div>
            </div>
          ) : vehicle.isSimulated || metro ? (
            <div className="text-[11px] font-medium text-rose-800 bg-rose-50 p-2 rounded-xl mt-1.5 border border-rose-200">
              <div className="flex items-center gap-1 font-bold">
                <TrainTrack className="w-3.5 h-3.5 text-rose-600" />
                Posizione simulata da modello orari
              </div>
              <p className="text-[10px] text-rose-700 mt-0.5 leading-snug">
                Non è telemetria GPS/ATC ufficiale.
              </p>
              {vehicle.statusDescription && (
                <p className="text-[10px] text-rose-700 mt-1">
                  {vehicle.statusDescription}
                </p>
              )}
            </div>
          ) : (
            vehicle.statusDescription && (
              <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg mt-1.5 border border-emerald-100/80">
                ● {vehicle.statusDescription}
              </div>
            )
          )}

          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-1.5 border-t border-slate-100">
            <span>
              {vehicle.isEstimated
                ? "Orario teorico"
                : vehicle.isSimulated || metro
                ? "Metro M1 (simulata)"
                : tram
                ? "Rete tramviaria"
                : "Autobus GTT"}
            </span>
            {vehicle.speed > 0 ? (
              <span className="font-bold text-[#0B5FFF]">{vehicle.speed} km/h</span>
            ) : (
              <span className="text-amber-600 font-bold">In fermata</span>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
            {onShareVehicle && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShareVehicle(vehicle);
                }}
                className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-200/80"
              >
                <Share2 className="w-3 h-3 text-emerald-600" />
                Condividi
              </button>
            )}
            {onFitRoute && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFitRoute(vehicle.line);
                }}
                className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold"
              >
                Inquadra tutto
              </button>
            )}
          </div>
        </div>
      </Popup>
      )}
    </Marker>
  );
});

function MapController({
  flyToCoords,
  routeBounds,
  onLocationFound,
  onLocationDenied,
  onBoundsChange,
  onZoomChange,
}: {
  flyToCoords: [number, number] | null;
  routeBounds: L.LatLngBoundsExpression | null;
  onLocationFound: (lat: number, lon: number) => void;
  onLocationDenied?: () => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
  onZoomChange?: (zoom: number) => void;
}) {
  const map = useMap();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number>(20);
  const hasCenteredUserRef = useRef(false);
  // Stable refs — parent callbacks change every render and MUST NOT restart GPS
  const onLocationFoundRef = useRef(onLocationFound);
  const onLocationDeniedRef = useRef(onLocationDenied);
  onLocationFoundRef.current = onLocationFound;
  onLocationDeniedRef.current = onLocationDenied;

  const centerOnUser = useCallback(
    (lat: number, lon: number, instant: boolean) => {
      if (hasCenteredUserRef.current) return;
      hasCenteredUserRef.current = true;
      const biasY = (MAP_CHROME_PAD.top - MAP_CHROME_PAD.bottom) / 2;
      if (instant) {
        map.setView([lat, lon], 16, { animate: false });
        map.panBy([0, biasY], { animate: false });
      } else {
        map.setView([lat, lon], 16, { animate: true, duration: 0.35 });
        map.once("moveend", () => {
          map.panBy([0, biasY], { animate: true, duration: 0.15 });
        });
      }
    },
    [map]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      onLocationDeniedRef.current?.();
      return;
    }

    let lastEmit = 0;
    let lastLat = 0;
    let lastLon = 0;

    const emitLocation = (lat: number, lon: number, accuracy: number) => {
      const now = performance.now();
      const moved =
        Math.abs(lat - lastLat) > 0.00005 || Math.abs(lon - lastLon) > 0.00005;
      // Throttle parent updates — watchPosition can fire very often
      if (!moved && now - lastEmit < 2000) return;
      lastEmit = now;
      lastLat = lat;
      lastLon = lon;
      setUserPos((prev) => {
        if (
          prev &&
          Math.abs(prev[0] - lat) < 1e-6 &&
          Math.abs(prev[1] - lon) < 1e-6
        ) {
          return prev;
        }
        return [lat, lon];
      });
      setUserAccuracy(Math.min(accuracy || 40, 120));
      writeCachedUserLocation(lat, lon, accuracy);
      onLocationFoundRef.current(lat, lon);
    };

    // Instant start from last known position (no GPS wait)
    const cached = readCachedUserLocation();
    if (cached) {
      emitLocation(cached.lat, cached.lon, cached.accuracy || 40);
      centerOnUser(cached.lat, cached.lon, true);
    }

    const handlePos = (pos: GeolocationPosition, refineOnly = false) => {
      const { latitude, longitude, accuracy } = pos.coords;
      emitLocation(latitude, longitude, accuracy);
      if (!refineOnly || !hasCenteredUserRef.current) {
        centerOnUser(latitude, longitude, false);
      }
    };

    const handleErr = (err: GeolocationPositionError) => {
      console.warn("GPS notice:", err.message);
      if (err.code === err.PERMISSION_DENIED) {
        onLocationDeniedRef.current?.();
      }
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => handlePos(pos, !!cached),
      handleErr,
      {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 60_000,
      }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => handlePos(pos, true),
      handleErr,
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 5000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
    // Intentionally omit parent callbacks — use refs to avoid restart loops
  }, [map, centerOnUser]);

  useEffect(() => {
    if (!flyToCoords) return;
    const biasY = (MAP_CHROME_PAD.top - MAP_CHROME_PAD.bottom) / 2;
    map.setView(flyToCoords, 17, { animate: true, duration: 0.35 });
    const onEnd = () => {
      map.panBy([0, biasY], { animate: true, duration: 0.15 });
      map.off("moveend", onEnd);
    };
    map.on("moveend", onEnd);
    return () => {
      map.off("moveend", onEnd);
    };
  }, [flyToCoords, map]);

  useEffect(() => {
    if (routeBounds) {
      map.fitBounds(routeBounds, mapFitPaddingOptions(16));
    }
  }, [routeBounds, map]);

  useMapEvents({
    moveend: (e) => onBoundsChange(e.target.getBounds()),
    zoomend: (e) => {
      onBoundsChange(e.target.getBounds());
      onZoomChange?.(e.target.getZoom());
    },
    locationfound: (e) => {
      setUserPos([e.latlng.lat, e.latlng.lng]);
      writeCachedUserLocation(e.latlng.lat, e.latlng.lng, e.accuracy);
      centerOnUser(e.latlng.lat, e.latlng.lng, false);
      onLocationFound(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (map) {
      onBoundsChange(map.getBounds());
      onZoomChange?.(map.getZoom());
    }
  }, [map, onBoundsChange, onZoomChange]);

  if (!userPos) return null;

  return (
    <>
      <CircleMarker
        center={userPos}
        radius={Math.max(14, Math.min(userAccuracy, 45))}
        pathOptions={{
          color: "#0B5FFF",
          weight: 1.5,
          fillColor: "#3b82f6",
          fillOpacity: 0.15,
        }}
      />
      <CircleMarker
        center={userPos}
        radius={7}
        pathOptions={{
          color: "#ffffff",
          weight: 2.5,
          fillColor: "#0B5FFF",
          fillOpacity: 1,
        }}
      />
    </>
  );
}

export default function BusMap() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allStops, setAllStops] = useState<StopData[]>([]);
  const [officialRoutes, setOfficialRoutes] = useState<OfficialRoute[]>([]);
  const [lineShapes, setLineShapes] = useState<Record<string, RouteShape[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [selectedStop, setSelectedStop] = useState<StopInfo | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [fitRouteTrigger, setFitRouteTrigger] = useState<L.LatLngBoundsExpression | null>(null);
  const lastFittedLineRef = useRef<string | null>(null);

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);
  const [tripInitial, setTripInitial] = useState<{
    from?: TripPlace;
    to?: TripPlace;
    departTime?: string;
    autoSearch?: boolean;
  } | null>(null);
  const [tripGuidance, setTripGuidance] = useState<{
    itinerary: TripItinerary;
    fromName: string;
    toName: string;
  } | null>(null);
  const [alertsCount, setAlertsCount] = useState(0);
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [shareModalData, setShareModalData] = useState<ShareData | null>(null);

  const [savedLines, setSavedLines] = useState<string[]>([]);
  const [savedStops, setSavedStops] = useState<{ code: string; name: string }[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [activeVehicleRoute, setActiveVehicleRoute] = useState<{
    vehicleId: string;
    line: string;
    dir: string | null;
    headsign?: string;
  } | null>(null);

  const [nearestStop, setNearestStop] = useState<{
    stop: StopInfo;
    distance: number;
  } | null>(null);

  const [isLive, setIsLive] = useState(false);
  const [geoDenied, setGeoDenied] = useState(false);
  const [geoHintVisible, setGeoHintVisible] = useState(false);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);
  const [mapZoom, setMapZoom] = useState(14);
  const [showEstimated, setShowEstimated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const mapBoot = useMemo(() => {
    const cached = readCachedUserLocation();
    if (cached) {
      return { center: [cached.lat, cached.lon] as [number, number], zoom: 16 };
    }
    return { center: TORINO_CENTER, zoom: 14 };
  }, []);

  const liveLineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of vehicles) {
      const key = normalizeLine(v.line);
      counts[key] = (counts[key] || 0) + 1;
      counts[v.line] = (counts[v.line] || 0) + 1;
    }
    return counts;
  }, [vehicles]);

  const stopCoordsByCode = useMemo(() => {
    const map: Record<string, { lat: number; lon: number }> = {};
    for (const s of allStops) {
      map[s.c] = { lat: s.lat, lon: s.lon };
    }
    return map;
  }, [allStops]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pollInFlightRef = useRef(false);
  const motionStatesRef = useRef<Map<string, VehicleMotionState>>(new Map());
  const feedVehiclesRef = useRef<Vehicle[]>([]);
  const motionRafRef = useRef(0);
  const motionLastTickRef = useRef(0);
  const motionRunningRef = useRef(false);
  const pollIntervalMsRef = useRef(REFRESH_MS_VISIBLE);
  const mapZoomRef = useRef(mapZoom);
  mapZoomRef.current = mapZoom;

  const clearTripGuidance = useCallback(() => {
    setTripGuidance(null);
    setSelectedLines(new Set());
    setFitRouteTrigger(null);
  }, []);

  const startTripGuidance = useCallback(
    (payload: {
      itinerary: TripItinerary;
      from: TripPlace;
      to: TripPlace;
    }) => {
      const lines = itineraryTransitLines(payload.itinerary);
      const next = new Set<string>();
      for (const raw of lines) {
        for (const id of expandLineFilter(normalizeLine(raw))) next.add(id);
        next.add(normalizeLine(raw));
      }
      setSelectedLines(next);
      setActiveVehicleRoute(null);
      setShowEstimated(false);
      setTripGuidance({
        itinerary: payload.itinerary,
        fromName: payload.from.name,
        toName: payload.to.name,
      });
      const pts = itineraryAllPoints(payload.itinerary);
      if (pts.length > 0) setFitRouteTrigger(L.latLngBounds(pts));
      setTripInitial(null);
      setActiveSheet(null);
    },
    []
  );

  const openSheet = useCallback((sheet: ActiveSheet) => {
    setActiveSheet(sheet);
    if (sheet !== "stop") setSelectedStop(null);
    if (sheet !== "share") setShareModalData(null);
  }, []);

  const closeSheet = useCallback(() => {
    setActiveSheet(null);
    setSelectedStop(null);
    setShareModalData(null);
  }, []);

  const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBoundsChange = useCallback((b: L.LatLngBounds) => {
    if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
    boundsDebounceRef.current = setTimeout(() => {
      setMapBounds(b);
      boundsDebounceRef.current = null;
    }, 180);
  }, []);

  const handleZoomChange = useCallback((z: number) => {
    setMapZoom(z);
  }, []);

  useEffect(() => {
    registerServiceWorker();
    try {
      const l = localStorage.getItem("gtt_fav_lines");
      if (l) setSavedLines(JSON.parse(l));
      const s = localStorage.getItem("gtt_fav_stops");
      if (s) setSavedStops(JSON.parse(s));
    } catch (e) {
      console.error("Error reading favorites:", e);
    }
  }, []);

  const handleToggleLineFavorite = useCallback((line: string) => {
    setSavedLines((prev) => {
      const next = prev.includes(line)
        ? prev.filter((x) => x !== line)
        : [...prev, line];
      try {
        localStorage.setItem("gtt_fav_lines", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleToggleStopFavorite = useCallback(
    (stop: { code: string; name: string }) => {
      setSavedStops((prev) => {
        const exists = prev.some((s) => s.code === stop.code);
        const next = exists
          ? prev.filter((s) => s.code !== stop.code)
          : [...prev, stop];
        try {
          localStorage.setItem("gtt_fav_stops", JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    []
  );

  useEffect(() => {
    fetch("/stops.json")
      .then((res) => res.json())
      .then((data: StopData[]) => setAllStops(data))
      .catch((err) => console.error("Error loading stops.json:", err));

    fetch("/routes.json")
      .then((res) => res.json())
      .then((data: OfficialRoute[]) => setOfficialRoutes(data))
      .catch((err) => console.error("Error loading routes.json:", err));

    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => setAlertsCount(data.count || 0))
      .catch((err) => console.error("Error checking alerts:", err));
  }, []);

  // ~3MB shapes: load only when drawing a route or enabling scheduled estimates
  useEffect(() => {
    if (!showEstimated && selectedLines.size === 0) return;
    if (Object.keys(lineShapes).length > 0) return;
    let cancelled = false;
    fetch("/line-shapes.json")
      .then((res) => res.json())
      .then((data: Record<string, RouteShape[]>) => {
        if (!cancelled) setLineShapes(data);
      })
      .catch((err) => console.error("Error loading line-shapes.json:", err));
    return () => {
      cancelled = true;
    };
  }, [showEstimated, selectedLines, lineShapes]);

  const mergeCalibratedVehicles = useCallback(
    (feed: Vehicle[], now: number): Vehicle[] => {
      const motions = motionStatesRef.current;
      return feed.map((v) => {
        if (v.isEstimated || v.isSimulated || isMetro(v.line)) return v;
        const st = motions.get(v.id);
        if (!st) return v;
        const s = sampleAt(st, now);
        return { ...v, lat: s.lat, lon: s.lon, heading: s.heading };
      });
    },
    []
  );

  const stopMotionLoop = useCallback(() => {
    if (motionRafRef.current) {
      cancelAnimationFrame(motionRafRef.current);
      motionRafRef.current = 0;
    }
    motionRunningRef.current = false;
  }, []);

  const startMotionLoop = useCallback(() => {
    if (motionRunningRef.current) return;
    motionRunningRef.current = true;
    motionLastTickRef.current = 0;

    const step = (t: number) => {
      if (!motionRunningRef.current) return;
      motionRafRef.current = requestAnimationFrame(step);

      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      // Zoomed out = light dots; snap on poll only (no glide loop)
      if (mapZoomRef.current < 14) {
        stopMotionLoop();
        return;
      }
      if (t - motionLastTickRef.current < MOTION_TICK_MS) return;
      motionLastTickRef.current = t;

      const now = Date.now();
      const ticks = tickMotions(motionStatesRef.current, now);
      const any = ticks.some((x) => x.animating);
      if (!any) {
        stopMotionLoop();
        setVehicles(mergeCalibratedVehicles(feedVehiclesRef.current, now));
        return;
      }
      setVehicles(mergeCalibratedVehicles(feedVehiclesRef.current, now));
    };

    motionRafRef.current = requestAnimationFrame(step);
  }, [mergeCalibratedVehicles, stopMotionLoop]);

  const applyFeedVehicles = useCallback(
    (feed: Vehicle[]) => {
      feedVehiclesRef.current = feed;
      const now = Date.now();
      const nextById = new Map<
        string,
        { lat: number; lon: number; heading: number; speed?: number }
      >();
      for (const v of feed) {
        if (v.isEstimated || v.isSimulated || isMetro(v.line)) continue;
        nextById.set(v.id, {
          lat: v.lat,
          lon: v.lon,
          heading: v.heading || 0,
          speed: v.speed,
        });
      }
      applyPollUpdate(
        motionStatesRef.current,
        nextById,
        now,
        pollIntervalMsRef.current
      );
      setVehicles(mergeCalibratedVehicles(feed, now));
      if (mapZoomRef.current >= 14) startMotionLoop();
    },
    [mergeCalibratedVehicles, startMotionLoop]
  );

  /** Silent background poll — no spinner / countdown UI. */
  const fetchVehicles = useCallback(async (opts?: { manual?: boolean }) => {
    const manual = !!opts?.manual;
    if (pollInFlightRef.current && !manual) return;
    if (
      !manual &&
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }
    pollInFlightRef.current = true;
    if (manual) setRefreshing(true);
    try {
      const res = await fetch("/api/vehicles", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      applyFeedVehicles(data.vehicles);
      setIsLive(true);
      setError(null);
    } catch (err: unknown) {
      setIsLive(false);
      setError(err instanceof Error ? err.message : "Errore rete");
    } finally {
      setLoading(false);
      setRefreshing(false);
      pollInFlightRef.current = false;
    }
  }, [applyFeedVehicles]);

  const armVehiclePoll = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const hidden =
      typeof document !== "undefined" &&
      document.visibilityState === "hidden";
    const ms = hidden ? REFRESH_MS_HIDDEN : REFRESH_MS_VISIBLE;
    pollIntervalMsRef.current = ms;
    intervalRef.current = setInterval(() => {
      void fetchVehicles();
    }, ms);
  }, [fetchVehicles]);

  useEffect(() => {
    fetchVehicles();
    armVehiclePoll();

    const onVis = () => {
      armVehiclePoll();
      if (document.visibilityState === "visible") {
        void fetchVehicles();
        startMotionLoop();
      } else {
        stopMotionLoop();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVis);
      stopMotionLoop();
    };
  }, [fetchVehicles, armVehiclePoll, startMotionLoop, stopMotionLoop]);

  const officialRouteIds = useMemo(
    () => new Set(officialRoutes.map((r) => r.id.replace(/\s+/g, "").toUpperCase())),
    [officialRoutes]
  );

  const allVehicles = useMemo(() => {
    // Schedule estimator walks ~3MB of shapes — only when the user asks
    // (stima ON) and we actually need synthetic markers.
    if (!showEstimated) return vehicles;
    if (Object.keys(lineShapes).length === 0) return vehicles;
    if (selectedLines.size === 0 && mapZoom < 15) return vehicles;

    let shapesForEstimate = lineShapes;
    if (selectedLines.size > 0) {
      const filtered: Record<string, RouteShape[]> = {};
      for (const raw of selectedLines) {
        for (const key of expandLineFilter(raw)) {
          const shapes = lineShapes[key] || lineShapes[normalizeLine(key)];
          if (shapes) filtered[key] = shapes;
        }
      }
      if (Object.keys(filtered).length === 0) return vehicles;
      shapesForEstimate = filtered;
    }

    const estimated = estimateScheduledVehicles(
      vehicles,
      shapesForEstimate,
      undefined,
      officialRouteIds
    );
    return [...vehicles, ...estimated];
  }, [
    vehicles,
    lineShapes,
    showEstimated,
    officialRouteIds,
    selectedLines,
    mapZoom,
  ]);

  const allLines = useMemo(() => {
    const lineSet = new Set<string>();
    officialRoutes.forEach((r) => lineSet.add(r.id));
    allVehicles.forEach((v) => lineSet.add(v.line));
    return Array.from(lineSet).sort(naturalSort);
  }, [officialRoutes, allVehicles]);

  const filteredVehicles = useMemo(() => {
    if (selectedLines.size === 0) return allVehicles;
    const cleanSelected = Array.from(selectedLines).flatMap(expandLineFilter);
    const cleanSet = new Set(cleanSelected);

    let list = allVehicles.filter((v) => {
      const vClean = normalizeLine(v.line);
      return (
        cleanSet.has(vClean) ||
        (cleanSet.has("16") && (vClean === "16CD" || vClean === "16CS"))
      );
    });

    if (selectedLines.size === 1 && selectedDirection !== null) {
      if (selectedDirection === "0") {
        list = list.filter(
          (v) =>
            !v.headsign ||
            v.headsign.toUpperCase().includes("FERMI") ||
            v.tripId.includes("DIR0")
        );
      } else if (selectedDirection === "1") {
        list = list.filter(
          (v) =>
            !v.headsign ||
            v.headsign.toUpperCase().includes("BENGASI") ||
            v.tripId.includes("DIR1")
        );
      }
    }
    return list;
  }, [allVehicles, selectedLines, selectedDirection]);

  const visibleVehicles = useMemo(() => {
    if (activeVehicleRoute) {
      const match = allVehicles.find((v) => v.id === activeVehicleRoute.vehicleId);
      return match ? [match] : [];
    }

    const [[south, west], [north, east]] = TORINO_SOFT_BOUNDS;
    const inRegion = (v: Vehicle) =>
      v.lat >= south && v.lat <= north && v.lon >= west && v.lon <= east;

    // Only GPS / live feed (+ metro). Scheduled estimates only if toggle ON.
    const isLiveGps = (v: Vehicle) => !v.isEstimated;

    let list = (selectedLines.size > 0 ? filteredVehicles : allVehicles).filter(
      (v) => inRegion(v) && (showEstimated || isLiveGps(v))
    );

    // Still clip to the visible map (not a count cap — every GPS bus on screen)
    if (mapBounds) {
      const padded = mapBounds.pad(0.15);
      list = list.filter((v) => padded.contains([v.lat, v.lon]));
    }

    return list;
  }, [
    allVehicles,
    activeVehicleRoute,
    selectedLines,
    mapBounds,
    filteredVehicles,
    showEstimated,
  ]);

  const handleToggleLine = useCallback((rawLine: string) => {
    setSelectedDirection(null);
    setActiveVehicleRoute(null);
    pushRecentLine(rawLine);
    const expanded = expandLineFilter(rawLine);
    setSelectedLines((prev) => {
      const next = new Set(prev);
      const allIn = expanded.every((l) => next.has(l));
      if (allIn) expanded.forEach((l) => next.delete(l));
      else expanded.forEach((l) => next.add(l));
      return next;
    });
  }, []);

  const handleClearLines = useCallback(() => {
    setSelectedDirection(null);
    setActiveVehicleRoute(null);
    setSelectedLines(new Set());
  }, []);

  const handleFitRouteForLine = useCallback(
    (rawLine: string) => {
      const clean = normalizeLine(rawLine);
      let shapes = lineShapes[rawLine] || lineShapes[clean];
      if (
        (!shapes || shapes.length === 0) &&
        (clean === "16" || clean === "16CD" || clean === "16CS")
      ) {
        shapes = [
          ...(lineShapes["16CD"] || []),
          ...(lineShapes["16CS"] || []),
          ...(lineShapes["16"] || []),
        ];
      }
      if (shapes && shapes.length > 0) {
        const allPts = shapes.flatMap((s) => s.pts);
        if (allPts.length > 0) setFitRouteTrigger(L.latLngBounds(allPts));
      }
    },
    [lineShapes]
  );

  useEffect(() => {
    const isLine16Pair =
      selectedLines.size === 2 &&
      selectedLines.has("16CD") &&
      selectedLines.has("16CS");
    if (selectedLines.size === 1 || isLine16Pair) {
      const lineKey = isLine16Pair ? "16" : Array.from(selectedLines)[0];
      if (lastFittedLineRef.current !== lineKey) {
        lastFittedLineRef.current = lineKey;
        handleFitRouteForLine(lineKey);
      }
    } else {
      lastFittedLineRef.current = null;
      setFitRouteTrigger(null);
    }
  }, [selectedLines, handleFitRouteForLine]);

  const handleSelectVehicle = useCallback(
    (v: Vehicle) => {
      const shapes = lineShapes[v.line] || lineShapes[normalizeLine(v.line)] || [];
      setActiveVehicleRoute({
        vehicleId: v.id,
        line: v.line,
        dir: getVehicleDirection(v, shapes),
        headsign: v.headsign,
      });
      setFlyToCoords([v.lat, v.lon]);
    },
    [lineShapes]
  );

  const handleFitCurrentRoute = useCallback(() => {
    if (selectedLines.size === 1) {
      handleFitRouteForLine(Array.from(selectedLines)[0]);
    } else if (
      selectedLines.size === 2 &&
      selectedLines.has("16CD") &&
      selectedLines.has("16CS")
    ) {
      handleFitRouteForLine("16");
    }
  }, [selectedLines, handleFitRouteForLine]);

  const availableDirections = useMemo(() => {
    if (selectedLines.size === 1) {
      const rawLine = Array.from(selectedLines)[0];
      const shapes = lineShapes[rawLine] || lineShapes[normalizeLine(rawLine)] || [];
      return shapes.map((s) => ({ dir: s.dir, headsign: s.headsign }));
    }
    if (
      selectedLines.size === 2 &&
      selectedLines.has("16CD") &&
      selectedLines.has("16CS")
    ) {
      return [
        { dir: "16CD", headsign: "Circolare Destra (16CD)" },
        { dir: "16CS", headsign: "Circolare Sinistra (16CS)" },
      ];
    }
    return [];
  }, [selectedLines, lineShapes]);

  const activeShapes = useMemo(() => {
    const linesToRender = new Set(selectedLines);
    if (activeVehicleRoute) linesToRender.add(activeVehicleRoute.line);
    if (linesToRender.size === 0 || linesToRender.size > 4) return [];

    const result: {
      line: string;
      dir: string;
      headsign: string;
      pts: [number, number][];
      isVehicleRoute?: boolean;
    }[] = [];

    linesToRender.forEach((line) => {
      const shapes = lineShapes[line] || lineShapes[normalizeLine(line)] || [];
      const isFromVehicle = activeVehicleRoute?.line === line;

      shapes.forEach((s) => {
        if (isFromVehicle && activeVehicleRoute?.dir !== null) {
          if (s.dir === activeVehicleRoute.dir) {
            result.push({
              line,
              dir: s.dir,
              headsign: s.headsign,
              pts: s.pts,
              isVehicleRoute: true,
            });
          }
        } else if (selectedLines.size === 1 && selectedDirection !== null) {
          if (s.dir === selectedDirection) {
            result.push({ line, dir: s.dir, headsign: s.headsign, pts: s.pts });
          }
        } else {
          result.push({
            line,
            dir: s.dir,
            headsign: s.headsign,
            pts: s.pts,
            isVehicleRoute: isFromVehicle,
          });
        }
      });
    });

    return result;
  }, [selectedLines, activeVehicleRoute, lineShapes, selectedDirection]);

  const handleSelectStop = useCallback((stop: StopInfo) => {
    pushRecentStop({ code: stop.code, name: stop.name });
    setSelectedStop(stop);
    setFlyToCoords([stop.lat, stop.lon]);
    setActiveSheet("stop");
    setShareModalData(null);
  }, []);

  const handleSelectStopByCode = useCallback(
    (code: string, fallbackName?: string) => {
      const found = allStops.find((s) => s.c === code);
      if (found) {
        handleSelectStop({
          code: found.c,
          name: found.n,
          desc: found.d,
          lat: found.lat,
          lon: found.lon,
        });
      } else {
        handleSelectStop({
          code,
          name: fallbackName || `Fermata #${code}`,
          lat: TORINO_CENTER[0],
          lon: TORINO_CENTER[1],
        });
      }
    },
    [allStops, handleSelectStop]
  );

  // Deep links /?stop= /?line= (notification click, share)
  useEffect(() => {
    if (typeof window === "undefined" || allStops.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const stopCode = params.get("stop");
    const line = params.get("line");
    if (!stopCode && !line) return;
    if (stopCode) handleSelectStopByCode(stopCode);
    else if (line) handleToggleLine(line);
    window.history.replaceState({}, "", "/");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apply once when stops load
  }, [allStops.length]);

  useEffect(() => {
    if (!geoDenied) return;
    setGeoHintVisible(true);
    const t = setTimeout(() => setGeoHintVisible(false), 10000);
    return () => clearTimeout(t);
  }, [geoDenied]);

  const lastNearestScanRef = useRef(0);

  const handleLocationFound = useCallback(
    (lat: number, lon: number) => {
      setGeoDenied(false);
      setGeoHintVisible(false);
      setUserCoords((prev) => {
        if (
          prev &&
          Math.abs(prev[0] - lat) < 1e-5 &&
          Math.abs(prev[1] - lon) < 1e-5
        ) {
          return prev;
        }
        return [lat, lon];
      });
      if (allStops.length === 0) return;

      const now = performance.now();
      if (now - lastNearestScanRef.current < 2500) return;
      lastNearestScanRef.current = now;

      let closest: StopData | null = null;
      let minDis = Infinity;
      for (let i = 0; i < allStops.length; i++) {
        const s = allStops[i];
        const dis = getDistanceMeters(lat, lon, s.lat, s.lon);
        if (dis < minDis) {
          minDis = dis;
          closest = s;
        }
      }

      if (closest && minDis <= 600) {
        const rounded = Math.round(minDis);
        setNearestStop((prev) => {
          if (
            prev &&
            prev.stop.code === closest!.c &&
            prev.distance === rounded
          ) {
            return prev;
          }
          return {
            stop: {
              code: closest!.c,
              name: closest!.n,
              desc: closest!.d,
              lat: closest!.lat,
              lon: closest!.lon,
            },
            distance: rounded,
          };
        });
      }
    },
    [allStops]
  );

  const handleLocationDenied = useCallback(() => {
    setGeoDenied(true);
  }, []);

  const handleShareVehicle = useCallback((v: Vehicle) => {
    const isM1 = isMetro(v.line);
    const lineLabel = isM1 ? "Metro M1 (VAL 208)" : `Linea ${v.line}`;
    const headsignText = v.headsign ? ` in direzione ${v.headsign}` : "";
    const speedText =
      v.speed > 0 ? `in marcia a ${v.speed} km/h` : "in sosta/fermata";
    const status = v.statusDescription ? ` (${v.statusDescription})` : "";

    setShareModalData({
      title: `Condividi ${lineLabel}`,
      text: `🚌 Sto seguendo ${lineLabel}${headsignText} a Torino!\nStato: ${speedText}${status}.\nTraccia la posizione in tempo reale:`,
      url:
        typeof window !== "undefined"
          ? `${window.location.origin}/?line=${v.line}`
          : "https://github.com/mattiax221/buslivetracker",
    });
    setActiveSheet("share");
    setSelectedStop(null);
  }, []);

  const handleLocate = useCallback(() => {
    if (userCoords) {
      setFlyToCoords([userCoords[0], userCoords[1]]);
    } else if (mapRef.current) {
      mapRef.current.locate({
        setView: true,
        maxZoom: 17,
        enableHighAccuracy: true,
      });
    }
  }, [userCoords]);

  const activeVehicle = activeVehicleRoute
    ? allVehicles.find((v) => v.id === activeVehicleRoute.vehicleId)
    : undefined;

  const hasShape =
    (selectedLines.size === 1 &&
      !!(
        lineShapes[Array.from(selectedLines)[0]] ||
        lineShapes[normalizeLine(Array.from(selectedLines)[0])]
      )) ||
    (selectedLines.size === 2 &&
      selectedLines.has("16CD") &&
      selectedLines.has("16CS"));

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: "var(--app-bg)" }}>
      <SmartAlertsRunner
        savedLines={savedLines}
        savedStops={savedStops}
        userCoords={userCoords}
        vehicles={vehicles}
      />
      {/* Map — full bleed */}
      <MapContainer
        center={mapBoot.center}
        zoom={mapBoot.zoom}
        minZoom={11}
        maxZoom={18}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={true}
        preferCanvas={true}
        ref={mapRef}
      >
        <TileLayer
          key="esri-street"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> · Dati mezzi GTT'
          maxZoom={19}
        />

        <MapController
          flyToCoords={flyToCoords}
          routeBounds={fitRouteTrigger}
          onLocationFound={handleLocationFound}
          onLocationDenied={handleLocationDenied}
          onBoundsChange={handleBoundsChange}
          onZoomChange={handleZoomChange}
        />

        {tripGuidance
          ? tripGuidance.itinerary.legs.map((leg, idx) => {
              if (!leg.points || leg.points.length < 2) return null;
              const color = leg.transit ? lineColor(leg.route) : "#64748b";
              return (
                <Fragment key={`guide-${idx}`}>
                  <Polyline
                    positions={leg.points}
                    pathOptions={{
                      color: "#0f172a",
                      weight: leg.transit ? 8 : 6,
                      opacity: 0.35,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                  <Polyline
                    positions={leg.points}
                    pathOptions={{
                      color,
                      weight: leg.transit ? 5 : 3.5,
                      opacity: 1,
                      dashArray: leg.transit ? undefined : "7, 8",
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  >
                    <Tooltip sticky>
                      <div className="text-xs font-sans font-bold">
                        {leg.transit
                          ? `Linea ${leg.route}`
                          : `A piedi · ${leg.fromName} → ${leg.toName}`}
                      </div>
                    </Tooltip>
                  </Polyline>
                </Fragment>
              );
            })
          : activeShapes.map((shape, idx) => {
              const color = lineColor(shape.line);
              const isHighlight = shape.isVehicleRoute;
              return (
                <Fragment key={`shape-${shape.line}-${shape.dir}-${idx}`}>
                  <Polyline
                    positions={shape.pts}
                    pathOptions={{
                      color: isHighlight ? "#0f172a" : "#ffffff",
                      weight: isHighlight ? 8 : 6,
                      opacity: isHighlight ? 0.95 : 0.85,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  />
                  <Polyline
                    positions={shape.pts}
                    pathOptions={{
                      color,
                      weight: isHighlight ? 5 : 3.5,
                      opacity: 1,
                      dashArray:
                        !isHighlight && shape.dir === "1" ? "8, 6" : undefined,
                      lineCap: "round",
                      lineJoin: "round",
                    }}
                  >
                    <Tooltip sticky>
                      <div className="text-xs font-sans">
                        <span className="font-bold">
                          {isMetro(shape.line)
                            ? "Metro M1"
                            : `Linea ${shape.line}`}
                        </span>
                        {shape.headsign && (
                          <div className="text-slate-600 font-medium">
                            → {shape.headsign}
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </Polyline>
                </Fragment>
              );
            })}

        {tripGuidance &&
          (() => {
            const pts = itineraryAllPoints(tripGuidance.itinerary);
            if (pts.length === 0) return null;
            const start = pts[0];
            const end = pts[pts.length - 1];
            return (
              <>
                <CircleMarker
                  center={start}
                  radius={8}
                  pathOptions={{
                    color: "#fff",
                    weight: 2,
                    fillColor: "#10b981",
                    fillOpacity: 1,
                  }}
                />
                <CircleMarker
                  center={end}
                  radius={8}
                  pathOptions={{
                    color: "#fff",
                    weight: 2,
                    fillColor: "#0B5FFF",
                    fillOpacity: 1,
                  }}
                />
              </>
            );
          })()}

        {visibleVehicles.map((v) => (
            <VehicleMarkerItem
              key={v.id}
              vehicle={v}
              compact={mapZoom < 15}
              detailOpen={activeVehicleRoute?.vehicleId === v.id}
              onSelectVehicle={handleSelectVehicle}
              onFitRoute={handleFitRouteForLine}
              onShareVehicle={handleShareVehicle}
            />
          ))}

        <StopsLayer
          allStops={allStops}
          onSelectStop={(stop) => handleSelectStop(stop)}
        />
      </MapContainer>

      {/* Top chrome column */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none">
        <MapTopChrome
          alertsCount={alertsCount}
          isLive={isLive && !error}
          onOpenAlerts={() => openSheet("alerts")}
        />
        <div className="pointer-events-none">
          <MapSearchPanel
            allLines={allLines}
            allStops={allStops}
            selectedLines={selectedLines}
            onToggleLine={handleToggleLine}
            onClearLines={handleClearLines}
            onSelectStop={handleSelectStop}
            filteredCount={filteredVehicles.length}
            totalCount={allVehicles.length}
            hasShape={hasShape}
            onFitRoute={handleFitCurrentRoute}
            savedLines={savedLines}
            savedStops={savedStops}
            onSelectStopByCode={handleSelectStopByCode}
            selectedDirection={selectedDirection}
            onSelectDirection={setSelectedDirection}
            availableDirections={availableDirections}
          />
          {tripGuidance ? (
            <TripGuidanceBanner
              itinerary={tripGuidance.itinerary}
              fromName={tripGuidance.fromName}
              toName={tripGuidance.toName}
              onClear={clearTripGuidance}
              onFit={() => {
                const pts = itineraryAllPoints(tripGuidance.itinerary);
                if (pts.length > 0) setFitRouteTrigger(L.latLngBounds(pts));
              }}
            />
          ) : (
            activeVehicleRoute && (
              <MapContextBanner
                line={activeVehicleRoute.line}
                headsign={activeVehicleRoute.headsign}
                isEstimated={activeVehicle?.isEstimated}
                onShare={() => {
                  if (activeVehicle) handleShareVehicle(activeVehicle);
                }}
                onFit={() => handleFitRouteForLine(activeVehicleRoute.line)}
                onClear={() => setActiveVehicleRoute(null)}
              />
            )
          )}
        </div>
      </div>

      {loading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-slate-100/50 backdrop-blur-[2px] pointer-events-none">
          <div className="chrome-enter flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 shadow-lg border border-white/70">
            <span className="live-dot live-dot--on" />
            <p className="text-xs text-slate-600 font-semibold">
              Collegamento in diretta…
            </p>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="absolute left-3 right-3 z-[1001] pointer-events-auto chrome-enter"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 7.5rem)" }}
        >
          <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl px-3 py-2.5 shadow-lg flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold leading-snug">
              Dati mezzi non aggiornati. Controlla la connessione.
            </p>
            <button
              onClick={() => fetchVehicles()}
              className="shrink-0 px-2.5 py-1 rounded-xl bg-amber-600 text-white text-[11px] font-bold active:scale-95"
            >
              Riprova
            </button>
          </div>
        </div>
      )}

      {geoHintVisible && !error && (
        <div className="absolute left-3 right-3 z-[1001] pointer-events-none"
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 7.5rem)" }}
        >
          <div className="bg-white/95 border border-slate-200 text-slate-700 rounded-2xl px-3 py-2 shadow-md text-[11px] font-medium">
            Posizione non disponibile. Puoi comunque cercare linee e fermate.
            Tocca «Vicino a me» dopo aver consentito il GPS.
          </div>
        </div>
      )}

      <MapBottomDock
        nearestStop={nearestStop}
        showNearestChip={!!nearestStop && activeSheet !== "stop"}
        favoritesCount={savedLines.length + savedStops.length}
        showEstimated={showEstimated}
        onToggleEstimated={() => setShowEstimated((v) => !v)}
        onLocate={handleLocate}
        onRefreshVehicles={() => {
          void fetchVehicles({ manual: true });
        }}
        refreshing={refreshing}
        onOpenFavorites={() => openSheet("favorites")}
        onOpenMetro={() => openSheet("metro")}
        onOpenAbout={() => openSheet("about")}
        onOpenTrip={() => {
          setTripInitial(null);
          openSheet("trip");
        }}
        onSelectNearest={() => {
          if (nearestStop) handleSelectStop(nearestStop.stop);
        }}
        sheetOpen={!!activeSheet}
      />

      <SheetHost active={activeSheet} onClose={closeSheet}>
        {activeSheet === "stop" && (
          <StopBottomSheet
            stop={selectedStop}
            hosted
            onClose={closeSheet}
            onSelectLine={(line) => {
              closeSheet();
              setActiveVehicleRoute(null);
              const cleanLine = normalizeLine(line);
              setSelectedLines(new Set(expandLineFilter(cleanLine)));
              handleFitRouteForLine(cleanLine);
            }}
            isFavorite={
              selectedStop
                ? savedStops.some((s) => s.code === selectedStop.code)
                : false
            }
            onToggleFavorite={handleToggleStopFavorite}
            onShareStop={(data) => {
              setShareModalData(data);
              setActiveSheet("share");
              setSelectedStop(null);
            }}
          />
        )}

        {activeSheet === "alerts" && (
          <AlertsBottomSheet
            isOpen
            hosted
            onClose={closeSheet}
            selectedLine={
              selectedLines.size === 1
                ? Array.from(selectedLines)[0]
                : undefined
            }
            onSelectLine={(line) => {
              handleToggleLine(line);
              closeSheet();
            }}
          />
        )}

        {activeSheet === "favorites" && (
          <FavoritesSheet
            isOpen
            hosted
            onClose={closeSheet}
            savedLines={savedLines}
            savedStops={savedStops}
            userCoords={userCoords}
            liveLineCounts={liveLineCounts}
            stopCoordsByCode={stopCoordsByCode}
            onLocateMe={handleLocate}
            onToggleLineFavorite={handleToggleLineFavorite}
            onToggleStopFavorite={handleToggleStopFavorite}
            onSelectLine={(line) => {
              handleToggleLine(line);
              closeSheet();
            }}
            onSelectStop={(code) => {
              handleSelectStopByCode(code);
            }}
            onOpenTrip={() => {
              setTripInitial(null);
              openSheet("trip");
            }}
            onOpenTripShortcut={(s) => {
              setTripInitial({
                from: s.from,
                to: s.to,
                departTime: s.departTime || undefined,
                autoSearch: true,
              });
              openSheet("trip");
            }}
          />
        )}

        {activeSheet === "metro" && (
          <MetroAccessibilitySheet
            isOpen
            hosted
            onClose={closeSheet}
            onFocusStation={(code) => {
              const meta = METRO_M1_ACCESSIBILITY.find((s) => s.code === code);
              const byName = meta
                ? allStops.find(
                    (s) =>
                      s.n.toLowerCase().includes(meta.name.toLowerCase()) ||
                      meta.name.toLowerCase().includes(s.n.toLowerCase())
                  )
                : undefined;
              if (byName) {
                setFlyToCoords([byName.lat, byName.lon]);
              } else if (METRO_FOCUS_FALLBACK[code]) {
                setFlyToCoords(METRO_FOCUS_FALLBACK[code]);
              }
              closeSheet();
            }}
          />
        )}

        {activeSheet === "share" && (
          <ShareModal
            isOpen
            hosted
            onClose={closeSheet}
            data={shareModalData}
          />
        )}

        {activeSheet === "about" && (
          <AboutPrivacySheet isOpen hosted onClose={closeSheet} />
        )}

        {activeSheet === "trip" && (
          <TripPlannerSheet
            isOpen
            hosted
            onClose={() => {
              setTripInitial(null);
              closeSheet();
            }}
            stops={allStops}
            userCoords={userCoords}
            initial={tripInitial}
            onStartGuidance={startTripGuidance}
          />
        )}
      </SheetHost>
    </div>
  );
}
