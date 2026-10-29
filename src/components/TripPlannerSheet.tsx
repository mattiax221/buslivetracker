"use client";

import { useState, useMemo } from "react";
import {
  X,
  Search,
  Navigation,
  ArrowUpDown,
  Clock,
  Footprints,
  Bus,
  TramFront as Tram,
  TrainTrack,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Share2,
  MapPin,
  Check,
  Sparkles,
} from "lucide-react";
import {
  TripPoint,
  TripItinerary,
  TripLeg,
  StopItem,
  TransitNetworkData,
  planTrip,
} from "../lib/tripPlanner";

interface TripPlannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userCoords: [number, number] | null;
  allStops: StopItem[];
  transitNetwork: TransitNetworkData | null;
  lineShapes: Record<string, { dir: string; headsign: string; pts: [number, number][] }[]>;
  liveVehicles?: { id: string; line: string; lat: number; lon: number }[];
  onSelectItinerary: (itinerary: TripItinerary) => void;
  onShareTrip: (itinerary: TripItinerary) => void;
}

const POPULAR_DESTINATIONS = [
  { name: "Stazione Porta Nuova", lat: 45.0622, lon: 7.6791 },
  { name: "Stazione Porta Susa", lat: 45.0707, lon: 7.6672 },
  { name: "Piazza Castello", lat: 45.0711, lon: 7.6853 },
  { name: "Politecnico di Torino", lat: 45.0633, lon: 7.6617 },
  { name: "Ospedale Molinette", lat: 45.0422, lon: 7.6717 },
  { name: "Lingotto Fiere & 8 Gallery", lat: 45.0303, lon: 7.6661 },
  { name: "Metro Fermi (Capolinea)", lat: 45.0743, lon: 7.5758 },
  { name: "Metro Bengasi (Capolinea)", lat: 45.0169, lon: 7.6631 },
];

export default function TripPlannerSheet({
  isOpen,
  onClose,
  userCoords,
  allStops,
  transitNetwork,
  lineShapes,
  liveVehicles,
  onSelectItinerary,
  onShareTrip,
}: TripPlannerSheetProps) {
  const [originQuery, setOriginQuery] = useState("");
  const [originPoint, setOriginPoint] = useState<TripPoint | null>(null);

  const [destQuery, setDestQuery] = useState("");
  const [destPoint, setDestPoint] = useState<TripPoint | null>(null);

  const [activeStepItineraryId, setActiveStepItineraryId] = useState<string | null>(null);
  const [expandedStopsLegIdx, setExpandedStopsLegIdx] = useState<number | null>(null);

  // Initialize origin as current GPS location if available
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

  // Plan trips when both points are defined
  const itineraries = useMemo(() => {
    if (!originPoint || !destPoint || !transitNetwork) return [];
    return planTrip(originPoint, destPoint, allStops, transitNetwork, lineShapes, liveVehicles);
  }, [originPoint, destPoint, transitNetwork, allStops, lineShapes, liveVehicles]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/60 via-white to-indigo-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-gray-900">Calcola Percorso (A → B)</h3>
              <p className="text-[11px] text-gray-500">
                Itinerari multi-modale bus, tram, metro e a piedi
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
        <div className="p-4 bg-gray-50/60 border-b border-gray-100">
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
                  placeholder="Dove vuoi andare (fermata, via, piazza)..."
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
          {!originPoint && userCoords && (
            <div className="mt-2.5">
              <button
                onClick={handleUseCurrentLocation}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50/80 active:scale-95 transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Usa la mia posizione attuale GPS</span>
              </button>
            </div>
          )}

          {/* Autocomplete dropdown for Origin */}
          {originSuggestions.length > 0 && (
            <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden text-xs">
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
            <div className="mt-2 bg-white rounded-xl shadow-lg border border-gray-100 divide-y divide-gray-100 overflow-hidden text-xs">
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
            </div>
          )}
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* If no destination chosen yet, show popular destinations */}
          {!destPoint && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Mete Frequenti a Torino
              </div>
              <div className="grid grid-cols-2 gap-2">
                {POPULAR_DESTINATIONS.map((dest) => (
                  <button
                    key={dest.name}
                    onClick={() => {
                      setDestPoint({ lat: dest.lat, lon: dest.lon, name: dest.name });
                      setDestQuery(dest.name);
                      if (!originPoint && userCoords) {
                        handleUseCurrentLocation();
                      }
                    }}
                    className="p-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all group"
                  >
                    <div className="text-xs font-bold text-gray-800 group-hover:text-blue-700 truncate">
                      {dest.name}
                    </div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <span>Seleziona come arrivo</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results: Itineraries list */}
          {originPoint && destPoint && itineraries.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-xs">
              Nessun itinerario trovato tra questi due punti con i mezzi attuali. Prova ad allargare la ricerca.
            </div>
          )}

          {itineraries.map((itinerary) => {
            const isSelected = activeStepItineraryId === itinerary.id;

            return (
              <div
                key={itinerary.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isSelected
                    ? "border-blue-500 bg-blue-50/30 shadow-md ring-2 ring-blue-100"
                    : "border-gray-200 bg-white hover:border-gray-300 shadow-xs"
                }`}
              >
                {/* Itinerary Summary Header */}
                <div
                  onClick={() =>
                    setActiveStepItineraryId(isSelected ? null : itinerary.id)
                  }
                  className="p-3.5 cursor-pointer flex items-start justify-between gap-2"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Badges row: Legs */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {itinerary.legs.map((leg, lIdx) => {
                        if (leg.type === "WALK") {
                          return (
                            <div
                              key={lIdx}
                              className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-[11px] font-bold"
                            >
                              <Footprints className="w-3 h-3 text-gray-500" />
                              <span>{leg.durationMinutes}m</span>
                            </div>
                          );
                        }

                        const isM1 = leg.mode === "METRO";
                        const isTr = leg.mode === "TRAM";

                        return (
                          <div key={lIdx} className="flex items-center gap-1">
                            {lIdx > 0 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                            <div
                              className={`flex items-center gap-1 text-white px-2 py-0.5 rounded-md text-[11px] font-black ${
                                isM1 ? "bg-rose-600" : isTr ? "bg-red-600" : "bg-blue-600"
                              }`}
                            >
                              {isM1 ? (
                                <TrainTrack className="w-3 h-3" />
                              ) : isTr ? (
                                <Tram className="w-3 h-3" />
                              ) : (
                                <Bus className="w-3 h-3" />
                              )}
                              <span>{isM1 ? "M1" : leg.line}</span>
                              <span className="text-[10px] font-normal opacity-90">
                                • {leg.durationMinutes}m
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Timing & Headsign */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-black text-gray-900 text-sm">
                        {itinerary.totalMinutes} min
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-600 font-medium">
                        Arrivo {itinerary.arrivalTime}
                      </span>
                      {itinerary.isFastest && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                          Più veloce
                        </span>
                      )}
                      {itinerary.isLeastWalk && (
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                          Meno a piedi
                        </span>
                      )}
                    </div>

                    {/* Real-Time Live Vehicle notice */}
                    {itinerary.legs.some((l) => l.liveVehicle) && (
                      <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                          Mezzo in arrivo tra{" "}
                          {itinerary.legs.find((l) => l.liveVehicle)?.liveVehicle?.etaMinutes} min!
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-gray-400 p-1">
                    {isSelected ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Expanded Detailed Turn-by-Turn Steps */}
                {isSelected && (
                  <div className="p-3.5 border-t border-gray-100 bg-white space-y-3 animate-in fade-in duration-200">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Dettagli Itinerario Passo-Passo
                    </div>

                    <div className="space-y-3">
                      {itinerary.legs.map((leg, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs">
                          {leg.type === "WALK" ? (
                            <div className="w-7 h-7 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0 mt-0.5">
                              <Footprints className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div
                              className={`w-7 h-7 rounded-xl text-white flex items-center justify-center shrink-0 mt-0.5 font-black text-xs ${
                                leg.mode === "METRO"
                                  ? "bg-rose-600"
                                  : leg.mode === "TRAM"
                                  ? "bg-red-600"
                                  : "bg-blue-600"
                              }`}
                            >
                              {leg.mode === "METRO" ? "M1" : leg.line}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {leg.type === "WALK" ? (
                              <div>
                                <div className="font-bold text-gray-800">
                                  Cammina fino a {leg.toName}
                                </div>
                                <div className="text-[11px] text-gray-400">
                                  {leg.distanceMeters}m • circa {leg.durationMinutes} min
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="font-bold text-gray-900">
                                  {leg.mode === "METRO" ? "Metro M1" : `Linea ${leg.line}`}
                                  {leg.headsign && (
                                    <span className="font-normal text-gray-600 ml-1">
                                      dir. {leg.headsign}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-gray-500">
                                  Sali a <span className="font-bold">{leg.fromName}</span> (#{leg.fromCode})
                                </div>

                                {leg.stopsCount && (
                                  <div className="pt-1">
                                    <button
                                      onClick={() =>
                                        setExpandedStopsLegIdx(
                                          expandedStopsLegIdx === idx ? null : idx
                                        )
                                      }
                                      className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                                    >
                                      <span>
                                        {leg.stopsCount} fermate ({leg.durationMinutes} min)
                                      </span>
                                      {expandedStopsLegIdx === idx ? (
                                        <ChevronUp className="w-3 h-3" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3" />
                                      )}
                                    </button>

                                    {/* Intermediate stops list */}
                                    {expandedStopsLegIdx === idx && leg.intermediateStops && (
                                      <div className="mt-1 pl-2 border-l-2 border-gray-200 space-y-1 py-1 text-[11px] text-gray-600">
                                        {leg.intermediateStops.map((st, sIdx) => (
                                          <div key={sIdx} className="truncate">
                                            • {st.name} (#{st.code})
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="text-[11px] text-gray-500 pt-0.5">
                                  Scendi a <span className="font-bold">{leg.toName}</span> (#{leg.toCode})
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions bar */}
                    <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                      <button
                        onClick={() => {
                          onSelectItinerary(itinerary);
                          onClose();
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Mostra su Mappa</span>
                      </button>

                      <button
                        onClick={() => onShareTrip(itinerary)}
                        className="py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                        title="Condividi percorso"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Condividi</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

