"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo, Fragment, memo } from "react";
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
  Search,
  X,
  ChevronDown,
  Navigation,
  Layers,
  AlertTriangle,
  Sparkles,
  MapPin,
  Clock,
  Info,
  RefreshCw,
  Star,
  Bell,
  TrainTrack,
  ArrowRight,
} from "lucide-react";
import StopsLayer, { StopData } from "./StopsLayer";
import StopBottomSheet from "./StopBottomSheet";
import AlertsBottomSheet from "./AlertsBottomSheet";
import AIAssistantSheet from "./AIAssistantSheet";
import FavoritesSheet from "./FavoritesSheet";
import {
  CommuteAlarm,
  playTransitChime,
  triggerVibration,
  isAlarmActiveNow,
  sendSystemNotification,
} from "../lib/alarmEngine";

/* ── Types ── */
interface Vehicle {
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

/* ── Constants ── */
const TORINO_CENTER: [number, number] = [45.0703, 7.6869];
const REFRESH_MS = 5_000; // 5 secondi ultra-rapidi

/* ── Known tram lines in Turin ── */
const TRAM_LINES = new Set([
  "3", "3/", "3B",
  "4", "4/", "4B",
  "7",
  "9", "9/", "9B", "9b",
  "10", "10/", "10B",
  "13", "13/",
  "15", "15/",
  "16", "16CD", "16CS", "16 CD", "16 CS",
  "79",
]);

function isMetro(line: string): boolean {
  const clean = line.replace(/\s+/g, "").toUpperCase();
  return clean === "M1" || clean === "METRO";
}

function isTram(line: string): boolean {
  if (isMetro(line)) return false;
  const clean = line.replace(/\s+/g, "").toUpperCase();
  if (TRAM_LINES.has(clean) || TRAM_LINES.has(line)) return true;
  if (/^16(CD|CS)?$/i.test(clean)) return true;
  return false;
}

/* ── Distance helper (haversine) ── */
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

/* ── Line color ── */
function lineColor(line: string): string {
  if (isMetro(line)) return "#e11d48"; // Ruby Red for Metro M1
  if (isTram(line)) return "#dc2626"; // Crimson Red for tram
  let hash = 0;
  for (let i = 0; i < line.length; i++) {
    hash = line.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 70%, 42%)`;
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/* ── Cached vehicle icons (prevents DOM rebuilding & memory thrashing) ── */
const vehicleIconCache = new Map<string, L.DivIcon>();

function getVehicleIcon(line: string, heading: number): L.DivIcon {
  const roundedRot = Math.round((heading || 0) / 15) * 15;
  const key = `${line}_${roundedRot}`;
  let icon = vehicleIconCache.get(key);
  if (!icon) {
    const color = lineColor(line);
    icon = L.divIcon({
      className: "bus-marker",
      html: `
        <div class="bus-marker-container" style="transform: translate(-50%, -50%); cursor: pointer;">
          <div class="bus-arrow" style="transform: rotate(${roundedRot}deg);">
            <svg width="10" height="10" viewBox="0 0 12 12" style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);">
              <polygon points="6,0 10,10 6,7 2,10" fill="${color}"/>
            </svg>
          </div>
          <div class="bus-badge" style="
            background: ${color};
            color: white;
            font-size: 10px;
            font-weight: 800;
            padding: 1.5px 5px;
            border-radius: 6px;
            white-space: nowrap;
            box-shadow: 0 1px 4px rgba(0,0,0,0.3);
            border: 1.5px solid white;
            min-width: 20px;
            text-align: center;
            line-height: 1.2;
          ">
            ${line}
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

/* ── Memoized Vehicle Marker Component ── */
const VehicleMarkerItem = memo(function VehicleMarkerItem({
  vehicle,
}: {
  vehicle: Vehicle;
}) {
  const metro = isMetro(vehicle.line);
  const tram = !metro && isTram(vehicle.line);
  const icon = getVehicleIcon(vehicle.line, vehicle.heading);

  return (
    <Marker position={[vehicle.lat, vehicle.lon]} icon={icon}>
      <Popup>
        <div className="text-sm min-w-[170px] p-1 font-sans">
          <div className="font-bold text-base text-gray-900 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5">
              {metro ? (
                <TrainTrack className="w-4 h-4 text-rose-600" />
              ) : tram ? (
                <Tram className="w-4 h-4 text-red-600" />
              ) : (
                <Bus className="w-4 h-4 text-blue-600" />
              )}
              <span>{metro ? "Metro M1" : `Linea ${vehicle.line}`}</span>
            </div>
            {metro && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                VAL 208
              </span>
            )}
          </div>

          {vehicle.headsign && (
            <div className="text-xs font-semibold text-gray-700 mt-1 flex items-center gap-1">
              <span className="text-gray-400">Direzione:</span>
              <span className="truncate">{vehicle.headsign}</span>
            </div>
          )}

          {vehicle.statusDescription && (
            <div className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg mt-1.5 border border-emerald-100/80">
              ● {vehicle.statusDescription}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-1.5 border-t border-gray-100">
            <span>{metro ? "Metropolitana" : tram ? "Rete Tramviaria" : "Autobus GTT"}</span>
            {vehicle.speed > 0 ? (
              <span className="font-bold text-blue-600">{vehicle.speed} km/h</span>
            ) : (
              <span className="text-amber-600 font-bold">In fermata</span>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

/* ── Isolated Live Sync Pill (prevents map re-renders on 1s tick) ── */
const LiveSyncPill = memo(function LiveSyncPill({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 5 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <button
      onClick={() => {
        setCountdown(5);
        onRefresh();
      }}
      disabled={isRefreshing}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold active:scale-95 transition-transform shadow-xs"
      title="Tocca per forzare l'aggiornamento GPS immediato"
    >
      <RefreshCw
        className={`w-3 h-3 ${isRefreshing ? "animate-spin text-emerald-400" : "text-slate-400"}`}
      />
      <span className="font-mono">
        {isRefreshing ? "GPS..." : `${countdown}s`}
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    </button>
  );
});

/* ── Map Controller & User Location Layer ── */
function MapController({
  flyToCoords,
  routeBounds,
  onLocationFound,
  onBoundsChange,
}: {
  flyToCoords: [number, number] | null;
  routeBounds: L.LatLngBoundsExpression | null;
  onLocationFound: (lat: number, lon: number) => void;
  onBoundsChange: (bounds: L.LatLngBounds) => void;
}) {
  const map = useMap();
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (flyToCoords) {
      map.flyTo(flyToCoords, 17, { duration: 1.2 });
    }
  }, [flyToCoords, map]);

  useEffect(() => {
    if (routeBounds) {
      map.fitBounds(routeBounds, { padding: [40, 40], maxZoom: 16 });
    }
  }, [routeBounds, map]);

  useMapEvents({
    moveend: (e) => {
      onBoundsChange(e.target.getBounds());
    },
    zoomend: (e) => {
      onBoundsChange(e.target.getBounds());
    },
    locationfound: (e) => {
      setUserPos([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, 16, { duration: 1 });
      onLocationFound(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (map) {
      onBoundsChange(map.getBounds());
    }
  }, [map, onBoundsChange]);

  if (!userPos) return null;

  return (
    <>
      <CircleMarker
        center={userPos}
        radius={22}
        pathOptions={{
          color: "#3b82f6",
          weight: 1,
          fillColor: "#3b82f6",
          fillOpacity: 0.2,
        }}
      />
      <CircleMarker
        center={userPos}
        radius={7}
        pathOptions={{
          color: "#ffffff",
          weight: 2.5,
          fillColor: "#2563eb",
          fillOpacity: 1,
        }}
      />
    </>
  );
}

/* ── Unified Search & Filter Panel ── */
function UnifiedFilterPanel({
  allLines,
  allStops,
  selectedLines,
  onToggleLine,
  onClearLines,
  onSelectStop,
  filteredCount,
  totalCount,
  hasShape,
  onFitRoute,
  savedLines,
  savedStops,
  onOpenFavorites,
  onSelectStopByCode,
  selectedDirection,
  onSelectDirection,
  availableDirections,
}: {
  allLines: string[];
  allStops: StopData[];
  selectedLines: Set<string>;
  onToggleLine: (line: string) => void;
  onClearLines: () => void;
  onSelectStop: (stop: StopInfo) => void;
  filteredCount: number;
  totalCount: number;
  hasShape?: boolean;
  onFitRoute?: () => void;
  savedLines: string[];
  savedStops: { code: string; name: string }[];
  onOpenFavorites: () => void;
  onSelectStopByCode: (code: string, name?: string) => void;
  selectedDirection: string | null;
  onSelectDirection: (dir: string | null) => void;
  availableDirections: { dir: string; headsign: string }[];
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);

  const matchingLines = useMemo(() => {
    if (!search.trim()) return allLines;
    const q = search.trim().toLowerCase();
    return allLines.filter((l) => l.toLowerCase().includes(q));
  }, [allLines, search]);

  const matchingStops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];

    const results: StopData[] = [];
    for (let i = 0; i < allStops.length; i++) {
      const s = allStops[i];
      if (
        s.c === q ||
        s.c.startsWith(q) ||
        s.n.toLowerCase().includes(q) ||
        (s.d && s.d.toLowerCase().includes(q))
      ) {
        results.push(s);
        if (results.length >= 6) break;
      }
    }
    return results;
  }, [allStops, search]);

  const isFiltering = selectedLines.size > 0;
  const isMetroMatching = !search.trim() || search.trim().toLowerCase().includes("m") || search.trim().toLowerCase().includes("metro");

  return (
    <div className="absolute top-12 left-0 right-0 z-[999] pointer-events-none">
      <div className="mx-3 pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Cerca linea (M1, 4, 16CD) o fermata (138, Statuto)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!expanded) setExpanded(true);
              }}
              onFocus={() => setExpanded(true)}
              className="flex-1 bg-transparent text-xs sm:text-sm font-medium outline-none placeholder:text-gray-400"
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                {isFiltering ? `${filteredCount}/${totalCount}` : totalCount}
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200"
            >
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Expanded results & chips */}
          {expanded && (
            <div className="border-t border-gray-100 bg-white">
              {matchingStops.length > 0 && (
                <div className="p-2 border-b border-gray-100 bg-blue-50/40">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Fermate trovate</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchingStops.map((st) => (
                      <button
                        key={`search-stop-${st.c}`}
                        onClick={() => {
                          onSelectStop({
                            code: st.c,
                            name: st.n,
                            desc: st.d,
                            lat: st.lat,
                            lon: st.lon,
                          });
                          setExpanded(false);
                          setSearch("");
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl bg-white hover:bg-blue-100/50 active:bg-blue-100 flex items-center justify-between border border-blue-100/60 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {st.n}
                            </span>
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded">
                              #{st.c}
                            </span>
                          </div>
                          {st.d && (
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {st.d}
                            </p>
                          )}
                        </div>
                        <span className="text-blue-600 text-xs font-bold ml-2">Arrivi →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-gray-50/50">
                {isFiltering ? (
                  <button
                    onClick={onClearLines}
                    className="text-red-500 hover:text-red-700 font-bold"
                  >
                    ✕ Annulla filtro
                  </button>
                ) : (
                  <span className="text-gray-400">Filtra per mezzo</span>
                )}
                <button
                  onClick={() => setExpanded(false)}
                  className="text-blue-600 font-semibold"
                >
                  Chiudi
                </button>
              </div>

              <div className="px-3 pb-3 pt-2 max-h-56 overflow-y-auto">
                {/* Metropolitana Section */}
                {isMetroMatching && (
                  <>
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TrainTrack className="w-3.5 h-3.5" />
                        <span>Metropolitana di Torino</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        VAL 208 Live
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        onClick={() => onToggleLine("M1")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-3 ${
                          selectedLines.has("M1")
                            ? "bg-rose-600 text-white shadow-md scale-105"
                            : isFiltering
                            ? "bg-gray-100 text-gray-400"
                            : "bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <TrainTrack className="w-3.5 h-3.5" />
                          <span>M1 Fermi ↔ Bengasi</span>
                        </div>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                            selectedLines.has("M1")
                              ? "bg-white/20 text-white"
                              : "bg-rose-200/70 text-rose-900"
                          }`}
                        >
                          {selectedLines.has("M1")
                            ? `${filteredCount} treni live`
                            : "Live"}
                        </span>
                      </button>
                    </div>
                  </>
                )}

                {/* Tram Section */}
                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tram className="w-3.5 h-3.5" />
                  <span>Rete Tramviaria</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {matchingLines.filter((l) => isTram(l)).map((line) => {
                    const active = selectedLines.has(line);
                    return (
                      <button
                        key={line}
                        onClick={() => onToggleLine(line)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          active
                            ? "text-white shadow-md scale-105"
                            : isFiltering
                            ? "bg-gray-100 text-gray-400"
                            : "bg-red-50 text-red-900 border border-red-100 hover:bg-red-100"
                        }`}
                        style={active ? { backgroundColor: "#dc2626" } : undefined}
                      >
                        {line}
                      </button>
                    );
                  })}
                </div>

                {/* Autobus Section */}
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5" />
                  <span>Linee Autobus</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchingLines.filter((l) => !isTram(l) && !isMetro(l)).map((line) => {
                    const active = selectedLines.has(line);
                    return (
                      <button
                        key={line}
                        onClick={() => onToggleLine(line)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          active
                            ? "text-white shadow-md scale-105"
                            : isFiltering
                            ? "bg-gray-100 text-gray-400"
                            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                        }`}
                        style={active ? { backgroundColor: lineColor(line) } : undefined}
                      >
                        {line}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notice when selected line has 0 live vehicles */}
        {selectedLines.size > 0 && filteredCount === 0 && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-3 text-xs pointer-events-auto animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2 text-amber-900 min-w-0">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="truncate">
                <span className="font-bold">
                  Linea {Array.from(selectedLines).join(", ")}
                </span>
                : nessun GPS attivo in questo momento.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick 1-Click Favorites Row (shown when idle) */}
      {!expanded && !isFiltering && (savedLines.length > 0 || savedStops.length > 0) && (
        <div className="mx-3 mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 pointer-events-auto">
          <button
            onClick={onOpenFavorites}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-xs shrink-0 active:scale-95 transition-transform"
          >
            <Star className="w-3 h-3 fill-current" />
            <span>I tuoi Preferiti</span>
          </button>
          {savedLines.map((line) => (
            <button
              key={`fav-line-${line}`}
              onClick={() => onToggleLine(line)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white text-gray-800 shadow-xs border border-gray-200 shrink-0 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: lineColor(line) }}
              />
              <span>{isMetro(line) ? "Metro M1" : `Linea ${line}`}</span>
            </button>
          ))}
          {savedStops.map((st) => (
            <button
              key={`fav-stop-${st.code}`}
              onClick={() => onSelectStopByCode(st.code, st.name)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white text-gray-800 shadow-xs border border-gray-200 shrink-0 hover:bg-gray-50 active:scale-95 transition-all"
            >
              <MapPin className="w-3 h-3 text-blue-600" />
              <span className="truncate max-w-[110px]">{st.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active Line Filter Badges & Direction Switcher */}
      {!expanded && isFiltering && (
        <div className="mx-3 mt-2 flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from(selectedLines)
              .sort(naturalSort)
              .map((line) => (
                <button
                  key={line}
                  onClick={() => onToggleLine(line)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md active:scale-95 transition-transform"
                  style={{ backgroundColor: lineColor(line) }}
                >
                  <span>{isMetro(line) ? "Metro M1" : line}</span>
                  <span className="opacity-80">✕</span>
                </button>
              ))}
            {hasShape && onFitRoute && (
              <button
                onClick={onFitRoute}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 bg-white shadow-md hover:bg-slate-50 transition-all border border-slate-200 active:scale-95"
                title="Centra la mappa sul tracciato completo della linea"
              >
                <span>🛤️ Tracciato</span>
              </button>
            )}
            <button
              onClick={onClearLines}
              className="px-2.5 py-1 rounded-full text-xs font-bold text-gray-600 bg-white shadow-md active:scale-95 transition-transform"
            >
              Reset
            </button>
          </div>

          {/* Direction toggle (Andata vs Ritorno) when 1 line is selected */}
          {availableDirections.length > 1 && (
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-md border border-gray-200 overflow-x-auto text-[11px] w-fit">
              <button
                onClick={() => onSelectDirection(null)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  selectedDirection === null
                    ? "bg-slate-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Tutti i sensi
              </button>
              {availableDirections.map((d) => (
                <button
                  key={`dir-${d.dir}`}
                  onClick={() => onSelectDirection(d.dir)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
                    selectedDirection === d.dir
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <ArrowRight className="w-3 h-3" />
                  <span className="truncate max-w-[130px]">
                    {d.headsign || (d.dir === "0" ? "Andata" : "Ritorno")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Main Map Component
   ══════════════════════════════════════════ */
export default function BusMap() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allStops, setAllStops] = useState<StopData[]>([]);
  const [officialRoutes, setOfficialRoutes] = useState<OfficialRoute[]>([]);
  const [lineShapes, setLineShapes] = useState<Record<string, RouteShape[]>>({});
  const [count, setCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [selectedStop, setSelectedStop] = useState<StopInfo | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [fitRouteTrigger, setFitRouteTrigger] = useState<L.LatLngBoundsExpression | null>(null);
  const lastFittedLineRef = useRef<string | null>(null);

  // Sheets
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [alertsCount, setAlertsCount] = useState(0);
  const [showLegend, setShowLegend] = useState(false);

  // Favorites & Alarms State
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [savedLines, setSavedLines] = useState<string[]>([]);
  const [savedStops, setSavedStops] = useState<{ code: string; name: string }[]>([]);
  const [alarms, setAlarms] = useState<CommuteAlarm[]>([]);
  const [selectedDirection, setSelectedDirection] = useState<string | null>(null);
  const [activeAlarmToast, setActiveAlarmToast] = useState<{
    line: string;
    stopName: string;
    minutes: number;
  } | null>(null);
  const lastTriggeredRef = useRef<Record<string, number>>({});

  // Closest stop near user GPS
  const [nearestStop, setNearestStop] = useState<{ stop: StopInfo; distance: number } | null>(null);
  const [mapStyle, setMapStyle] = useState<"clean" | "minimal" | "osm">("clean");

  // Live Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mapBounds, setMapBounds] = useState<L.LatLngBounds | null>(null);

  const handleBoundsChange = useCallback((b: L.LatLngBounds) => {
    setMapBounds(b);
  }, []);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Load localStorage favorites & alarms
  useEffect(() => {
    try {
      const l = localStorage.getItem("gtt_fav_lines");
      if (l) setSavedLines(JSON.parse(l));
      const s = localStorage.getItem("gtt_fav_stops");
      if (s) setSavedStops(JSON.parse(s));
      const a = localStorage.getItem("gtt_commute_alarms");
      if (a) setAlarms(JSON.parse(a));
    } catch (e) {
      console.error("Error reading localStorage favorites:", e);
    }
  }, []);

  // Background Commuter Alarm Runner (checks every 25s)
  useEffect(() => {
    if (alarms.length === 0) return;

    const checkAlarms = async () => {
      const activeAlarms = alarms.filter((a) => a.enabled && isAlarmActiveNow(a));
      if (activeAlarms.length === 0) return;

      const now = Date.now();
      for (const alarm of activeAlarms) {
        // Cooldown: 4 minutes
        const last = lastTriggeredRef.current[alarm.id] || 0;
        if (now - last < 4 * 60 * 1000) continue;

        try {
          const res = await fetch(`/api/stops/arrivals?stop=${encodeURIComponent(alarm.stopCode)}`);
          if (!res.ok) continue;
          const data = await res.json();
          const arrivals = data.arrivals || [];

          const match = arrivals.find(
            (arr: any) =>
              arr.line.toUpperCase() === alarm.line.toUpperCase() &&
              arr.minutesRemaining <= alarm.thresholdMinutes
          );

          if (match) {
            lastTriggeredRef.current[alarm.id] = now;
            playTransitChime();
            triggerVibration();
            sendSystemNotification(
              `Linea ${alarm.line} in arrivo!`,
              `Tra ${match.minutesRemaining} min alla fermata ${alarm.stopName || alarm.stopCode}`
            );
            setActiveAlarmToast({
              line: alarm.line,
              stopName: alarm.stopName || `Fermata #${alarm.stopCode}`,
              minutes: match.minutesRemaining,
            });
            break;
          }
        } catch (e) {
          console.error("Alarm check error:", e);
        }
      }
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 25000);
    return () => clearInterval(interval);
  }, [alarms]);

  // Favorites & Alarms handlers
  const handleToggleLineFavorite = useCallback((line: string) => {
    setSavedLines((prev) => {
      const next = prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line];
      try {
        localStorage.setItem("gtt_fav_lines", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleToggleStopFavorite = useCallback((stop: { code: string; name: string }) => {
    setSavedStops((prev) => {
      const exists = prev.some((s) => s.code === stop.code);
      const next = exists ? prev.filter((s) => s.code !== stop.code) : [...prev, stop];
      try {
        localStorage.setItem("gtt_fav_stops", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleAddAlarm = useCallback((newAlarm: Omit<CommuteAlarm, "id">) => {
    const alarm: CommuteAlarm = {
      ...newAlarm,
      id: Math.random().toString(36).substring(2, 9),
    };
    setAlarms((prev) => {
      const next = [...prev, alarm];
      try {
        localStorage.setItem("gtt_commute_alarms", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleToggleAlarm = useCallback((id: string) => {
    setAlarms((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a));
      try {
        localStorage.setItem("gtt_commute_alarms", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleDeleteAlarm = useCallback((id: string) => {
    setAlarms((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem("gtt_commute_alarms", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  useEffect(() => {
    fetch("/stops.json")
      .then((res) => res.json())
      .then((data: StopData[]) => setAllStops(data))
      .catch((err) => console.error("Error loading stops.json:", err));

    fetch("/routes.json")
      .then((res) => res.json())
      .then((data: OfficialRoute[]) => setOfficialRoutes(data))
      .catch((err) => console.error("Error loading routes.json:", err));

    fetch("/line-shapes.json")
      .then((res) => res.json())
      .then((data: Record<string, RouteShape[]>) => setLineShapes(data))
      .catch((err) => console.error("Error loading line-shapes.json:", err));

    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => setAlertsCount(data.count || 0))
      .catch((err) => console.error("Error checking alerts count:", err));
  }, []);

  const fetchVehicles = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/vehicles");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ApiResponse = await res.json();
      setVehicles(data.vehicles);
      setCount(data.count);
      setLastUpdate(
        new Date(data.timestamp).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    intervalRef.current = setInterval(fetchVehicles, REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchVehicles]);

  const allLines = useMemo(() => {
    const lineSet = new Set<string>();
    officialRoutes.forEach((r) => lineSet.add(r.id));
    vehicles.forEach((v) => lineSet.add(v.line));
    return Array.from(lineSet).sort(naturalSort);
  }, [officialRoutes, vehicles]);

  const filteredVehicles = useMemo(() => {
    if (selectedLines.size === 0) return vehicles;
    let list = vehicles.filter((v) => selectedLines.has(v.line));
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
  }, [vehicles, selectedLines, selectedDirection]);

  // High-performance viewport culling: renders only vehicles in view (+ 25% edge margin)
  const visibleVehicles = useMemo(() => {
    if (selectedLines.size > 0) {
      return filteredVehicles;
    }
    if (!mapBounds) return vehicles.slice(0, 80);
    const padded = mapBounds.pad(0.25);
    return vehicles.filter((v) => padded.contains([v.lat, v.lon]));
  }, [vehicles, selectedLines, mapBounds, filteredVehicles]);

  const handleToggleLine = useCallback((line: string) => {
    setSelectedDirection(null);
    setSelectedLines((prev) => {
      const next = new Set(prev);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return next;
    });
  }, []);

  const handleClearLines = useCallback(() => {
    setSelectedDirection(null);
    setSelectedLines(new Set());
  }, []);

  // Auto-fit route bounds when a single line is selected
  useEffect(() => {
    if (selectedLines.size === 1) {
      const line = Array.from(selectedLines)[0];
      if (lastFittedLineRef.current !== line) {
        lastFittedLineRef.current = line;
        const shapes = lineShapes[line];
        if (shapes && shapes.length > 0) {
          const allPts = shapes.flatMap((s) => s.pts);
          if (allPts.length > 0) {
            setFitRouteTrigger(L.latLngBounds(allPts));
          }
        }
      }
    } else {
      lastFittedLineRef.current = null;
      setFitRouteTrigger(null);
    }
  }, [selectedLines, lineShapes]);

  const handleFitCurrentRoute = useCallback(() => {
    if (selectedLines.size === 1) {
      const line = Array.from(selectedLines)[0];
      const shapes = lineShapes[line];
      if (shapes && shapes.length > 0) {
        const allPts = shapes.flatMap((s) => s.pts);
        if (allPts.length > 0) {
          setFitRouteTrigger(L.latLngBounds(allPts));
        }
      }
    }
  }, [selectedLines, lineShapes]);

  const availableDirections = useMemo(() => {
    if (selectedLines.size !== 1) return [];
    const line = Array.from(selectedLines)[0];
    const shapes = lineShapes[line] || [];
    return shapes.map((s) => ({ dir: s.dir, headsign: s.headsign }));
  }, [selectedLines, lineShapes]);

  const activeShapes = useMemo(() => {
    if (selectedLines.size === 0 || selectedLines.size > 4) return [];
    const result: { line: string; dir: string; headsign: string; pts: [number, number][] }[] = [];
    selectedLines.forEach((line) => {
      const shapes = lineShapes[line] || [];
      shapes.forEach((s) => {
        if (selectedLines.size === 1 && selectedDirection !== null) {
          if (s.dir === selectedDirection) {
            result.push({ line, dir: s.dir, headsign: s.headsign, pts: s.pts });
          }
        } else {
          result.push({ line, dir: s.dir, headsign: s.headsign, pts: s.pts });
        }
      });
    });
    return result;
  }, [selectedLines, lineShapes, selectedDirection]);

  const handleSelectStop = useCallback((stop: StopInfo) => {
    setSelectedStop(stop);
    setFlyToCoords([stop.lat, stop.lon]);
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

  const handleLocationFound = useCallback(
    (lat: number, lon: number) => {
      if (allStops.length === 0) return;

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
        setNearestStop({
          stop: {
            code: closest.c,
            name: closest.n,
            desc: closest.d,
            lat: closest.lat,
            lon: closest.lon,
          },
          distance: minDis,
        });
      }
    },
    [allStops]
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Top Status Bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] bg-white border-b border-gray-100 px-4 py-2.5 flex items-center justify-between text-sm pt-safe shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Bus className="w-4 h-4" />
          </div>
          <span className="font-black text-gray-900 tracking-tight text-base">GTT Live</span>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Copilot Button */}
          <button
            onClick={() => setIsAIOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold active:scale-95 transition-all shadow-xs"
            title="Assistente AI Torino"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Assistente</span>
          </button>

          {/* Favorites & Commute Alarms button */}
          <button
            onClick={() => setIsFavoritesOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-bold active:scale-95 transition-all shadow-2xs"
            title="Linee e fermate preferite, sveglie pendolare"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[11px] hidden sm:inline">Preferiti</span>
            {savedLines.length + savedStops.length + alarms.filter((a) => a.enabled).length > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {savedLines.length + savedStops.length + alarms.filter((a) => a.enabled).length}
              </span>
            )}
          </button>

          {/* Alerts button */}
          <button
            onClick={() => setIsAlertsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-900 text-xs font-bold active:scale-95 transition-all shadow-2xs"
            title="Deviazioni, scioperi e avvisi"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] hidden sm:inline">Avvisi</span>
            {alertsCount > 0 && (
              <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {alertsCount}
              </span>
            )}
          </button>

          {/* Isolated Live Sync Countdown Pill */}
          <LiveSyncPill isRefreshing={isRefreshing} onRefresh={fetchVehicles} />
        </div>
      </div>

      {/* Alarm Alert Toast */}
      {activeAlarmToast && (
        <div className="absolute top-14 left-3 right-3 z-[1100] bg-rose-600 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
              <Bell className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black tracking-wider uppercase text-rose-200">
                SVEGLIA PENDOLARE • GTT LIVE
              </div>
              <div className="text-xs font-bold truncate">
                Linea {activeAlarmToast.line} in arrivo tra {activeAlarmToast.minutes} min
              </div>
              <div className="text-[11px] text-rose-100 truncate">
                {activeAlarmToast.stopName}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveAlarmToast(null)}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white shrink-0 font-bold text-xs"
          >
            Ricevuto
          </button>
        </div>
      )}

      {/* Unified Search & Filter panel */}
      <UnifiedFilterPanel
        allLines={allLines}
        allStops={allStops}
        selectedLines={selectedLines}
        onToggleLine={handleToggleLine}
        onClearLines={handleClearLines}
        onSelectStop={handleSelectStop}
        filteredCount={filteredVehicles.length}
        totalCount={count}
        hasShape={selectedLines.size === 1 && !!lineShapes[Array.from(selectedLines)[0]]}
        onFitRoute={handleFitCurrentRoute}
        savedLines={savedLines}
        savedStops={savedStops}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onSelectStopByCode={handleSelectStopByCode}
        selectedDirection={selectedDirection}
        onSelectDirection={setSelectedDirection}
        availableDirections={availableDirections}
      />

      {/* Map */}
      <MapContainer
        center={TORINO_CENTER}
        zoom={14}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        preferCanvas={true}
        ref={mapRef}
      >
        {mapStyle === "clean" && (
          <TileLayer
            key="clean-style"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            maxZoom={19}
          />
        )}
        {mapStyle === "minimal" && (
          <>
            <TileLayer
              key="minimal-base"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              maxZoom={19}
            />
            <TileLayer
              key="minimal-labels"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              maxZoom={19}
            />
          </>
        )}
        {mapStyle === "osm" && (
          <TileLayer
            key="osm-style"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
        )}

        <MapController
          flyToCoords={flyToCoords}
          routeBounds={fitRouteTrigger}
          onLocationFound={handleLocationFound}
          onBoundsChange={handleBoundsChange}
        />

        {/* Route Polylines (Tracciati) */}
        {activeShapes.map((shape, idx) => {
          const color = lineColor(shape.line);
          return (
            <Fragment key={`shape-${shape.line}-${shape.dir}-${idx}`}>
              {/* Outer white casing for high contrast on street maps */}
              <Polyline
                positions={shape.pts}
                pathOptions={{
                  color: "#ffffff",
                  weight: 6,
                  opacity: 0.85,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              />
              {/* Colored route line */}
              <Polyline
                positions={shape.pts}
                pathOptions={{
                  color,
                  weight: 3.5,
                  opacity: 0.95,
                  dashArray: shape.dir === "1" ? "8, 6" : undefined,
                  lineCap: "round",
                  lineJoin: "round",
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-sans">
                    <span className="font-bold">Linea {shape.line}</span>
                    {shape.headsign && (
                      <div className="text-gray-600 font-medium">→ {shape.headsign}</div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {shape.dir === "0" ? "Andata" : "Ritorno"}
                    </div>
                  </div>
                </Tooltip>
              </Polyline>
            </Fragment>
          );
        })}

        {/* Real-time bus & tram markers (memoized & viewport-culled for 60fps) */}
        {visibleVehicles.map((v) => (
          <VehicleMarkerItem key={v.id} vehicle={v} />
        ))}

        {/* Dynamic Stops Layer */}
        <StopsLayer
          allStops={allStops}
          onSelectStop={(stop) => handleSelectStop(stop)}
        />
      </MapContainer>

      {/* Floating Action Buttons (Right Side) */}
      <div className="absolute bottom-20 right-3 z-[1000] flex flex-col gap-2.5">
        {/* Map style toggle */}
        <button
          onClick={() => {
            setMapStyle((prev) =>
              prev === "clean" ? "minimal" : prev === "minimal" ? "osm" : "clean"
            );
          }}
          className="bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl border border-gray-100 active:scale-95 transition-transform text-slate-700"
          title="Cambia stile mappa"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* Locate button */}
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.locate({ setView: true, maxZoom: 16 });
            }
          }}
          className="bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-xl border border-gray-100 active:scale-95 transition-transform text-blue-600"
          title="La mia posizione"
        >
          <Navigation className="w-5 h-5" />
        </button>
      </div>

      {/* Clean Floating Legend (Bottom Left) */}
      <div className="absolute bottom-5 left-3 z-[900]">
        {showLegend ? (
          <div className="bg-white rounded-2xl p-3 shadow-xl border border-gray-100 text-xs space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between font-bold text-gray-900 border-b pb-1.5">
              <span>Legenda Mappa</span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 text-gray-700">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-red-600 shrink-0" />
                <span>Tram (3, 4, 9, 10, 15, 16...)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-blue-600 shrink-0" />
                <span>Autobus GTT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-blue-900 border-2 border-white shadow-xs shrink-0" />
                <span>Fermata Palina (zoom $\ge$ 16)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>Tracciamento Satellitare GPS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-1 rounded-full bg-slate-900 border border-white shrink-0" />
                <span>Tracciato Percorso Linea</span>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLegend(true)}
            className="bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-gray-100 flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Legenda</span>
          </button>
        )}
      </div>

      {/* Nearest Stop Toast Pill */}
      {nearestStop && !selectedStop && (
        <div className="absolute bottom-16 left-3 right-16 z-[950] animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => handleSelectStop(nearestStop.stop)}
            className="w-full bg-slate-900 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold truncate">
                  Fermata più vicina ({nearestStop.distance}m)
                </div>
                <div className="text-[11px] text-gray-300 truncate">
                  {nearestStop.stop.name} (#{nearestStop.stop.code})
                </div>
              </div>
            </div>
            <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-xl shrink-0">
              Orari →
            </span>
          </button>
        </div>
      )}

      {/* Stop Arrival Details Bottom Sheet */}
      <StopBottomSheet
        stop={selectedStop}
        onClose={() => setSelectedStop(null)}
        onSelectLine={(line) => {
          setSelectedStop(null);
          handleToggleLine(line);
        }}
        isFavorite={selectedStop ? savedStops.some((s) => s.code === selectedStop.code) : false}
        onToggleFavorite={handleToggleStopFavorite}
      />

      {/* Service Alerts Bottom Sheet */}
      <AlertsBottomSheet
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        selectedLine={selectedLines.size === 1 ? Array.from(selectedLines)[0] : undefined}
        onSelectLine={(line) => {
          handleToggleLine(line);
        }}
      />

      {/* Free AI Transit Copilot */}
      <AIAssistantSheet
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onSelectLine={(line) => {
          handleToggleLine(line);
        }}
      />

      {/* Favorites & Commute Alarms Sheet */}
      <FavoritesSheet
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        savedLines={savedLines}
        savedStops={savedStops}
        alarms={alarms}
        onToggleLineFavorite={handleToggleLineFavorite}
        onToggleStopFavorite={handleToggleStopFavorite}
        onAddAlarm={handleAddAlarm}
        onToggleAlarm={handleToggleAlarm}
        onDeleteAlarm={handleDeleteAlarm}
        onSelectLine={(line) => {
          handleToggleLine(line);
        }}
        onSelectStop={(code) => {
          handleSelectStopByCode(code);
        }}
      />
    </div>
  );
}
