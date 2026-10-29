"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X,
  Navigation,
  ArrowUpDown,
  Footprints,
  Bus,
  Bike,
  Car,
  MapPin,
  ExternalLink,
  Sparkles,
  Search,
} from "lucide-react";
import {
  TripPoint,
  StopItem,
  TravelMode,
  getGoogleMapsTransitUrl,
} from "../lib/tripPlanner";

interface TripPlannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords: [number, number] | null;
  allStops: StopItem[];
  transitNetwork?: any;
  lineShapes?: any;
  liveVehicles?: any;
  onSelectItinerary?: (itinerary: any) => void;
  onShareTrip?: (itinerary: any) => void;
}

const POPULAR_DESTINATIONS = [
  { name: "Stazione Porta Nuova", desc: "FS & Metro M1", icon: "🚄", lat: 45.0622, lon: 7.6791 },
  { name: "Stazione Porta Susa", desc: "Alta Velocità & Metro", icon: "🚄", lat: 45.0707, lon: 7.6672 },
  { name: "Piazza Castello", desc: "Centro Storico", icon: "🏛️", lat: 45.0711, lon: 7.6853 },
  { name: "Politecnico di Torino", desc: "C.so Duca degli Abruzzi", icon: "🎓", lat: 45.0633, lon: 7.6617 },
  { name: "Ospedale Molinette", desc: "Polo Sanitario & Metro", icon: "🏥", lat: 45.0422, lon: 7.6717 },
  { name: "Lingotto Fiere & 8 Gallery", desc: "Via Nizza & Metro", icon: "🏬", lat: 45.0303, lon: 7.6661 },
  { name: "Allianz Stadium", desc: "Juventus Stadium", icon: "⚽", lat: 45.1095, lon: 7.6412 },
  { name: "Reggia di Venaria", desc: "Residenza Sabauda", icon: "👑", lat: 45.1362, lon: 7.6239 },
  { name: "Parco del Valentino", desc: "Borgo Medievale", icon: "🌳", lat: 45.0531, lon: 7.6844 },
  { name: "Basilica di Superga", desc: "Tranvia a cremagliera", icon: "🚠", lat: 45.0808, lon: 7.7675 },
  { name: "Metro Fermi", desc: "Capolinea Ovest Collegno", icon: "🚇", lat: 45.0743, lon: 7.5758 },
  { name: "Metro Bengasi", desc: "Capolinea Sud Moncalieri", icon: "🚇", lat: 45.0169, lon: 7.6631 },
];

export default function TripPlannerSheet({
  isOpen,
  onClose,
  userCoords,
  allStops,
}: TripPlannerSheetProps) {
  const [originQuery, setOriginQuery] = useState("");
  const [originPoint, setOriginPoint] = useState<TripPoint | null>(null);

  const [destQuery, setDestQuery] = useState("");
  const [destPoint, setDestPoint] = useState<TripPoint | null>(null);

  const [travelMode, setTravelMode] = useState<TravelMode>("transit");

  // Auto-initialize origin as current GPS location when opening
  useEffect(() => {
    if (isOpen && userCoords && !originPoint && !originQuery) {
      setOriginPoint({
        lat: userCoords[0],
        lon: userCoords[1],
        name: "📍 La mia posizione attuale",
      });
      setOriginQuery("📍 La mia posizione attuale");
    }
  }, [isOpen, userCoords, originPoint, originQuery]);

  // Compute Universal Google Maps URL
  const googleMapsUrl = useMemo(() => {
    const orig = originPoint || (userCoords ? { lat: userCoords[0], lon: userCoords[1], name: "La mia posizione" } : originQuery.trim() ? { name: originQuery.trim() } : null);
    const dest = destPoint || (destQuery.trim() ? { name: destQuery.trim() } : null);
    return getGoogleMapsTransitUrl(orig, dest, travelMode);
  }, [originPoint, destPoint, originQuery, destQuery, userCoords, travelMode]);

  // Initialize origin as current GPS location
  const handleUseCurrentLocation = () => {
    if (userCoords) {
      setOriginPoint({
        lat: userCoords[0],
        lon: userCoords[1],
        name: "📍 La mia posizione attuale",
      });
      setOriginQuery("📍 La mia posizione attuale");
    }
  };

  // Autocomplete suggestions for Origin
  const originSuggestions = useMemo(() => {
    if (!originQuery || originQuery === "📍 La mia posizione attuale" || originPoint) return [];
    const q = originQuery.toLowerCase().trim();
    return allStops
      .filter((s) => s.n.toLowerCase().includes(q) || s.c.includes(q))
      .slice(0, 5);
  }, [originQuery, originPoint, allStops]);

  // Autocomplete suggestions for Destination
  const destSuggestions = useMemo(() => {
    if (!destQuery || destPoint) return [];
    const q = destQuery.toLowerCase().trim();
    return allStops
      .filter((s) => s.n.toLowerCase().includes(q) || s.c.includes(q))
      .slice(0, 5);
  }, [destQuery, destPoint, allStops]);

  // Invert Origin and Destination
  const handleSwap = () => {
    const tempPoint = originPoint;
    const tempQuery = originQuery;
    setOriginPoint(destPoint);
    setOriginQuery(destQuery);
    setDestPoint(tempPoint);
    setDestQuery(tempQuery);
  };

  // Launch Google Maps
  const handleOpenGoogleMaps = () => {
    window.open(googleMapsUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-1.5">
                <span>Calcola Percorso</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                  Google Maps Transit
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">
                Itinerari ufficiali in tempo reale con bus, tram, metro e a piedi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs Card (Google Maps Style) */}
        <div className="p-4 bg-gray-50/70 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-2 relative">
            {/* Dots connector line */}
            <div className="flex flex-col items-center py-2.5 shrink-0 self-stretch justify-between">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-100" />
              <div className="w-0.5 flex-1 bg-gray-300 my-1 border-dashed" />
              <div className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-rose-100" />
            </div>

            {/* Input boxes */}
            <div className="flex-1 space-y-2">
              {/* Origin */}
              <div className="relative">
                <input
                  type="text"
                  value={originQuery}
                  onChange={(e) => {
                    setOriginQuery(e.target.value);
                    setOriginPoint(null);
                  }}
                  placeholder="Punto di partenza (o usa la tua posizione)..."
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-white border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
                {originQuery && (
                  <button
                    onClick={() => {
                      setOriginQuery("");
                      setOriginPoint(null);
                    }}
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Destination */}
              <div className="relative">
                <input
                  type="text"
                  value={destQuery}
                  onChange={(e) => {
                    setDestQuery(e.target.value);
                    setDestPoint(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (destSuggestions.length > 0) {
                        const s = destSuggestions[0];
                        setDestPoint({ lat: s.lat, lon: s.lon, name: `${s.n} (#${s.c})` });
                        setDestQuery(`${s.n} (#${s.c})`);
                      } else if (destQuery.trim()) {
                        handleOpenGoogleMaps();
                      }
                    }
                  }}
                  placeholder="Dove vuoi andare (es. Politecnico, Molinette, via...)"
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-white border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                />
                {destQuery && (
                  <button
                    onClick={() => {
                      setDestQuery("");
                      setDestPoint(null);
                    }}
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Invert Button */}
            <button
              onClick={handleSwap}
              className="w-9 h-9 rounded-2xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all shadow-xs shrink-0"
              title="Inverti partenza e arrivo"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>

          {/* Quick GPS button if origin not set */}
          {(!originPoint || originPoint.name !== "📍 La mia posizione attuale") && userCoords && (
            <div className="pt-0.5">
              <button
                onClick={handleUseCurrentLocation}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Usa la mia posizione attuale GPS</span>
              </button>
            </div>
          )}

          {/* Mode Selector Row */}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              onClick={() => setTravelMode("transit")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                travelMode === "transit"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>Transito GTT</span>
            </button>

            <button
              onClick={() => setTravelMode("walking")}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                travelMode === "walking"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title="A piedi"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>A piedi</span>
            </button>

            <button
              onClick={() => setTravelMode("bicycling")}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                travelMode === "bicycling"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title="Bici"
            >
              <Bike className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setTravelMode("driving")}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                travelMode === "driving"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              title="Auto"
            >
              <Car className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Autocomplete dropdown for Origin */}
          {originSuggestions.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden text-xs">
              {originSuggestions.map((s) => (
                <button
                  key={`o-${s.c}`}
                  onClick={() => {
                    setOriginPoint({ lat: s.lat, lon: s.lon, name: `${s.n} (#${s.c})` });
                    setOriginQuery(`${s.n} (#${s.c})`);
                  }}
                  className="w-full p-2.5 text-left hover:bg-blue-50 flex items-center justify-between"
                >
                  <span className="font-bold text-gray-800">{s.n}</span>
                  <span className="text-[10px] text-gray-400">Palina #{s.c}</span>
                </button>
              ))}
            </div>
          )}

          {/* Autocomplete dropdown for Destination */}
          {destSuggestions.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden text-xs">
              {destSuggestions.map((s) => (
                <button
                  key={`d-${s.c}`}
                  onClick={() => {
                    setDestPoint({ lat: s.lat, lon: s.lon, name: `${s.n} (#${s.c})` });
                    setDestQuery(`${s.n} (#${s.c})`);
                  }}
                  className="w-full p-2.5 text-left hover:bg-blue-50 flex items-center justify-between"
                >
                  <span className="font-bold text-gray-800">{s.n}</span>
                  <span className="text-[10px] text-gray-400">Palina #{s.c}</span>
                </button>
              ))}
              <button
                onClick={handleOpenGoogleMaps}
                className="w-full p-2.5 text-left bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 font-bold flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cerca &quot;{destQuery}&quot; su Google Maps</span>
                </div>
                <span className="text-[10px] bg-blue-200 text-blue-800 px-1.5 py-0.2 rounded font-black">
                  Apri ↗
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Primary High-Impact Google Maps Action Button */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-blue-200 active:scale-95 transition-all group pointer-events-auto"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div className="text-left min-w-0">
                <div className="font-black text-sm flex items-center gap-1.5 truncate">
                  <span>Apri Percorso su Google Maps</span>
                  <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-full font-bold shrink-0">
                    Nativo ↗
                  </span>
                </div>
                <div className="text-[11px] text-blue-100 font-normal truncate mt-0.5">
                  Tutte le linee GTT, cambi, ritardi in tempo reale e navigazione vocale
                </div>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-200 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
          </a>

          {/* Quick Selection: Mete Frequenti e Punti di Interesse di Torino */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
              <span>Mete Frequenti a Torino</span>
              <span className="text-[10px] text-gray-400 font-normal">Tocca per impostare</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {POPULAR_DESTINATIONS.map((dest) => {
                const isSelected = destPoint?.name === dest.name || destQuery === dest.name;

                return (
                  <button
                    key={dest.name}
                    onClick={() => {
                      setDestPoint({ lat: dest.lat, lon: dest.lon, name: dest.name });
                      setDestQuery(dest.name);
                      if (!originPoint && userCoords) {
                        handleUseCurrentLocation();
                      }
                    }}
                    className={`p-2.5 rounded-2xl border text-left transition-all group flex items-start gap-2.5 ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-100"
                        : "border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50/80 shadow-2xs"
                    }`}
                  >
                    <span className="text-base shrink-0 mt-0.5">{dest.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-800 group-hover:text-blue-700 truncate">
                        {dest.name}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">
                        {dest.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pro-Tip Explaining the Combined Power of Maps + Live Radar */}
          <div className="p-3.5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl shadow-sm text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-blue-200">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Come usare al meglio GTT Live + Google Maps</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Google Maps fornisce il calcolo perfetto del tragitto (linea consigliata e cambi). Una volta saputo quale bus o tram prendere, torna su questa app per seguire la posizione esatta satellitare del tuo mezzo in tempo reale sulla mappa!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
