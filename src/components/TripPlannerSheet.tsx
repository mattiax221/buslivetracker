"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  ArrowDownUp,
  Bus,
  Footprints,
  Clock,
  Navigation,
  Search,
  Star,
  Trash2,
  TramFront,
  MapPinned,
  Play,
} from "lucide-react";
import {
  defaultDepartTime,
  formatClock,
  formatDuration,
  getTripShortcuts,
  removeTripShortcut,
  saveTripShortcut,
  type TripItinerary,
  type TripPlace,
  type TripShortcut,
} from "../lib/tripPlan";
import { isMetro, lineColor } from "../lib/mapUtils";

export type StopOption = {
  c: string;
  n: string;
  d?: string;
  lat: number;
  lon: number;
};

type Field = "from" | "to";

type GeoHit = {
  name: string;
  label: string;
  lat: number;
  lon: number;
  kind: "street" | "address" | "place";
};

interface TripPlannerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  stops: StopOption[];
  userCoords?: [number, number] | null;
  initial?: {
    from?: TripPlace;
    to?: TripPlace;
    departTime?: string;
    autoSearch?: boolean;
  } | null;
  hosted?: boolean;
  onStartGuidance?: (payload: {
    itinerary: TripItinerary;
    from: TripPlace;
    to: TripPlace;
  }) => void;
}

function modeIcon(mode: string, route: string) {
  const m = mode.toUpperCase();
  if (m === "WALK") return <Footprints className="w-3.5 h-3.5 text-slate-500" />;
  if (m === "TRAM" || m === "RAIL" || isMetro(route))
    return <TramFront className="w-3.5 h-3.5 text-white" />;
  return <Bus className="w-3.5 h-3.5 text-white" />;
}

export default function TripPlannerSheet({
  isOpen,
  onClose,
  stops,
  userCoords = null,
  initial = null,
  hosted = false,
  onStartGuidance,
}: TripPlannerSheetProps) {
  const [from, setFrom] = useState<TripPlace | null>(null);
  const [to, setTo] = useState<TripPlace | null>(null);
  const [departTime, setDepartTime] = useState(defaultDepartTime);
  const [activeField, setActiveField] = useState<Field | null>(null);
  const [query, setQuery] = useState("");
  const [geoHits, setGeoHits] = useState<GeoHit[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itineraries, setItineraries] = useState<TripItinerary[]>([]);
  const [shortcuts, setShortcuts] = useState<TripShortcut[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShortcuts(getTripShortcuts());
    setError(null);
    setItineraries([]);
    setSaveOpen(false);
    setActiveField(null);
    setQuery("");
    setGeoHits([]);

    if (initial?.from) setFrom(initial.from);
    else setFrom(null);
    if (initial?.to) setTo(initial.to);
    else setTo(null);
    setDepartTime(initial?.departTime || defaultDepartTime());
    setSaveName(
      initial?.from && initial?.to
        ? `${initial.from.name} → ${initial.to.name}`
        : ""
    );
  }, [isOpen, initial]);

  useEffect(() => {
    if (!isOpen || !initial?.autoSearch || !initial.from || !initial.to) return;
    void runSearch(initial.from, initial.to, initial.departTime || defaultDepartTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial]);

  const stopSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return stops
      .filter(
        (s) =>
          s.n.toLowerCase().includes(q) ||
          s.c.includes(q) ||
          (s.d || "").toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query, stops]);

  // Streets / addresses via Nominatim (server proxy)
  useEffect(() => {
    const q = query.trim();
    if (!activeField || q.length < 3) {
      setGeoHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!cancelled) setGeoHits(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!cancelled) setGeoHits([]);
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    }, 320);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, activeField]);

  const pickPlace = (place: TripPlace) => {
    if (activeField === "to") setTo(place);
    else setFrom(place);
    setActiveField(null);
    setQuery("");
    setGeoHits([]);
  };

  const pickStop = (s: StopOption) => {
    pickPlace({ name: s.n, lat: s.lat, lon: s.lon, code: s.c });
  };

  const useMyLocation = () => {
    if (!userCoords) return;
    pickPlace({
      name: "La mia posizione",
      lat: userCoords[0],
      lon: userCoords[1],
    });
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  async function runSearch(
    fromP: TripPlace,
    toP: TripPlace,
    time: string
  ): Promise<void> {
    setLoading(true);
    setError(null);
    setItineraries([]);
    try {
      const now = new Date();
      const date = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${now.getFullYear()}`;
      const params = new URLSearchParams({
        fromLat: String(fromP.lat),
        fromLon: String(fromP.lon),
        toLat: String(toP.lat),
        toLon: String(toP.lon),
        time,
        date,
      });
      const res = await fetch(`/api/trip/plan?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const list = (data.itineraries || []) as TripItinerary[];
      if (list.length === 0) {
        setError("Nessun percorso trovato a quell’orario. Prova un altro orario.");
      }
      setItineraries(list);
      setSaveName(`${fromP.name} → ${toP.name}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di calcolo");
    } finally {
      setLoading(false);
    }
  }

  const onSearch = () => {
    if (!from || !to) {
      setError("Scegli partenza e arrivo (fermata, via o indirizzo).");
      return;
    }
    void runSearch(from, to, departTime);
  };

  const onSaveShortcut = () => {
    if (!from || !to) return;
    const next = saveTripShortcut({
      name: saveName || `${from.name} → ${to.name}`,
      from,
      to,
      departTime,
    });
    setShortcuts(next);
    setSaveOpen(false);
  };

  const loadShortcut = (s: TripShortcut) => {
    setFrom(s.from);
    setTo(s.to);
    const t = s.departTime || defaultDepartTime();
    setDepartTime(t);
    setSaveName(s.name);
    void runSearch(s.from, s.to, t);
  };

  if (!isOpen) return null;

  const panel = (
    <div className="bg-white rounded-t-3xl shadow-2xl max-h-[min(90dvh,100%)] flex flex-col overflow-hidden pb-safe animate-in slide-in-from-bottom duration-200">
      <div className="w-full flex justify-center pt-2.5 pb-1" onClick={onClose}>
        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
      </div>

      <div className="px-5 py-2 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Calcola percorso
          </h2>
          <p className="text-[11px] text-slate-500">
            Fermate, vie e corsi · bus/tram più veloci
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 px-4 py-3 space-y-3 overscroll-contain">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              setActiveField("from");
              setQuery("");
            }}
            className="w-full flex items-start gap-2.5 text-left"
          >
            <span className="mt-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Partenza
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {from?.name || "Fermata, via o corso…"}
              </div>
              {from?.code && (
                <div className="text-[10px] text-slate-400">#{from.code}</div>
              )}
            </div>
          </button>

          <div className="flex justify-center -my-0.5">
            <button
              type="button"
              onClick={swap}
              className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-600"
              title="Scambia"
            >
              <ArrowDownUp className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveField("to");
              setQuery("");
            }}
            className="w-full flex items-start gap-2.5 text-left"
          >
            <span className="mt-0.5 w-2.5 h-2.5 rounded-full bg-[#0B5FFF] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Arrivo
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {to?.name || "Fermata, via o corso…"}
              </div>
              {to?.code && (
                <div className="text-[10px] text-slate-400">#{to.code}</div>
              )}
            </div>
          </button>
        </div>

        {activeField && (
          <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-2 shadow-sm">
            <div className="text-xs font-bold text-slate-700">
              Cerca {activeField === "from" ? "partenza" : "arrivo"}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Es. Porta Nuova, Corso Francia…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium outline-none focus:border-[#0B5FFF]"
              />
            </div>
            {activeField === "from" && userCoords && (
              <button
                type="button"
                onClick={useMyLocation}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold"
              >
                <Navigation className="w-3.5 h-3.5" />
                Usa la mia posizione
              </button>
            )}

            <div className="max-h-52 overflow-y-auto space-y-2">
              {stopSuggestions.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 px-1 mb-1">
                    Fermate
                  </div>
                  {stopSuggestions.map((s) => (
                    <button
                      key={s.c}
                      type="button"
                      onClick={() => pickStop(s)}
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 active:bg-slate-100"
                    >
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {s.n}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        #{s.c}
                        {s.d ? ` · ${s.d}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {(geoHits.length > 0 || geoLoading) && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-400 px-1 mb-1">
                    Vie, corsi e indirizzi
                  </div>
                  {geoLoading && geoHits.length === 0 && (
                    <p className="text-[11px] text-slate-400 px-1 py-1">
                      Cerco in mappa…
                    </p>
                  )}
                  {geoHits.map((g, i) => (
                    <button
                      key={`${g.lat}-${g.lon}-${i}`}
                      type="button"
                      onClick={() =>
                        pickPlace({ name: g.name, lat: g.lat, lon: g.lon })
                      }
                      className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-slate-50 active:bg-slate-100 flex items-start gap-2"
                    >
                      <MapPinned className="w-3.5 h-3.5 text-[#0B5FFF] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {g.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {g.label}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {query.trim().length >= 2 &&
                stopSuggestions.length === 0 &&
                !geoLoading &&
                geoHits.length === 0 && (
                  <p className="text-[11px] text-slate-400 px-1 py-2">
                    Nessun risultato. Prova «Corso», «Via» o un codice palina.
                  </p>
                )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <label className="flex-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
            <Clock className="w-4 h-4 text-[#0B5FFF] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase text-slate-400">
                Parto alle
              </div>
              <input
                type="time"
                value={departTime}
                onChange={(e) => setDepartTime(e.target.value)}
                className="w-full text-sm font-bold text-slate-900 outline-none bg-transparent"
              />
            </div>
          </label>
          <button
            type="button"
            onClick={onSearch}
            disabled={loading}
            className="shrink-0 rounded-2xl bg-[#0B5FFF] text-white font-bold text-sm px-4 py-3.5 shadow-md shadow-blue-500/25 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "…" : "Cerca"}
          </button>
        </div>

        {shortcuts.length > 0 && itineraries.length === 0 && !loading && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-slate-400 px-0.5">
              Scorciatoie salvate
            </div>
            {shortcuts.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => loadShortcut(s)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-sm font-bold text-slate-900 truncate">
                    {s.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {s.from.name} → {s.to.name}
                    {s.departTime ? ` · ${s.departTime}` : ""}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setShortcuts(removeTripShortcut(s.id))}
                  className="p-2 text-slate-400 hover:text-rose-500"
                  title="Elimina"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs px-3 py-2.5 font-medium">
            {error}
          </div>
        )}

        {loading && (
          <div className="py-8 flex flex-col items-center gap-2 text-slate-400">
            <div className="w-6 h-6 border-2 border-[#0B5FFF] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Calcolo i percorsi più veloci…</p>
          </div>
        )}

        {itineraries.map((it, idx) => (
          <div
            key={`${it.startTime}-${idx}`}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
          >
            <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80">
              <div>
                <div className="text-sm font-black text-slate-900">
                  {formatDuration(it.durationSec)}
                  {idx === 0 && (
                    <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      più veloce
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  {formatClock(it.startTime)} → {formatClock(it.endTime)}
                  {it.transfers > 0
                    ? ` · ${it.transfers} cambi`
                    : " · senza cambi"}
                  {it.walkDistanceM > 0
                    ? ` · ${Math.round(it.walkDistanceM)} m a piedi`
                    : ""}
                </div>
              </div>
            </div>
            <div className="px-3.5 py-2.5 space-y-2">
              {it.legs.map((leg, li) => (
                <div key={li} className="flex items-start gap-2.5">
                  {leg.transit ? (
                    <div
                      className="w-9 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: lineColor(leg.route) }}
                    >
                      {modeIcon(leg.mode, leg.route)}
                    </div>
                  ) : (
                    <div className="w-9 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {modeIcon(leg.mode, leg.route)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900">
                      {leg.transit
                        ? `Linea ${leg.route}${leg.headsign ? ` · ${leg.headsign}` : ""}`
                        : `A piedi · ${formatDuration(leg.durationSec)}`}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {leg.fromName} → {leg.toName}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatClock(leg.startTime)} – {formatClock(leg.endTime)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {from && to && onStartGuidance && (
              <div className="px-3.5 pb-3">
                <button
                  type="button"
                  onClick={() =>
                    onStartGuidance({ itinerary: it, from, to })
                  }
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0B5FFF] text-white text-sm font-bold py-2.5 active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Avvia indicazioni
                </button>
              </div>
            )}
          </div>
        ))}

        {itineraries.length > 0 && from && to && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
            {!saveOpen ? (
              <button
                type="button"
                onClick={() => setSaveOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-bold text-amber-900 py-2"
              >
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                Salva come scorciatoia
              </button>
            ) : (
              <>
                <div className="text-[10px] font-bold uppercase text-amber-800/70">
                  Nome scorciatoia
                </div>
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="es. Casa → Lavoro"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveOpen(false)}
                    className="flex-1 rounded-xl py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={onSaveShortcut}
                    className="flex-1 rounded-xl py-2.5 text-xs font-bold text-white bg-amber-500"
                  >
                    Salva
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {!loading && itineraries.length === 0 && !error && (
          <p className="text-[11px] text-slate-400 text-center px-4 py-2 leading-relaxed">
            Cerca fermate oppure vie e corsi. Poi avvia le indicazioni sulla
            mappa: vedrai il tragitto e solo i bus/tram di quelle linee.
          </p>
        )}

        <p className="text-[9px] text-slate-300 text-center pb-2">
          Percorsi · Muoversi a Torino · Vie · OpenStreetMap
        </p>
      </div>
    </div>
  );

  if (hosted) return panel;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden />
      {panel}
    </div>
  );
}
