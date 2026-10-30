"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star,
  Trash2,
  X,
  MapPin,
  Bus,
  Navigation,
  Clock,
  Radio,
  Sparkles,
  Bell,
  History,
} from "lucide-react";
import Link from "next/link";
import { getDistanceMeters, isMetro, lineColor } from "../lib/mapUtils";
import {
  getRecentHistory,
  type RecentHistory,
} from "../lib/recentHistory";

type FavStop = { code: string; name: string };

interface StopArrivalPreview {
  line: string;
  minutesRemaining: number;
  realtime: boolean;
  statusText: string;
}

interface FavoritesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  savedLines: string[];
  savedStops: FavStop[];
  onToggleLineFavorite: (line: string) => void;
  onToggleStopFavorite: (stop: FavStop) => void;
  onSelectLine: (line: string) => void;
  onSelectStop: (code: string) => void;
  onLocateMe?: () => void;
  userCoords?: [number, number] | null;
  /** Live vehicle counts keyed by normalized line id */
  liveLineCounts?: Record<string, number>;
  /** Stop code → lat/lon for distance */
  stopCoordsByCode?: Record<string, { lat: number; lon: number }>;
  hosted?: boolean;
}

const SUGGESTED_LINES = ["4", "18", "55", "56", "M1", "10"];

export default function FavoritesSheet({
  isOpen,
  onClose,
  savedLines,
  savedStops,
  onToggleLineFavorite,
  onToggleStopFavorite,
  onSelectLine,
  onSelectStop,
  onLocateMe,
  userCoords = null,
  liveLineCounts = {},
  stopCoordsByCode = {},
  hosted = false,
}: FavoritesSheetProps) {
  const [arrivalsByStop, setArrivalsByStop] = useState<
    Record<string, StopArrivalPreview[]>
  >({});
  const [arrivalsLoading, setArrivalsLoading] = useState(false);
  const [recent, setRecent] = useState<RecentHistory>({ lines: [], stops: [] });

  useEffect(() => {
    if (!isOpen) return;
    setRecent(getRecentHistory());
  }, [isOpen]);

  const sortedStops = useMemo(() => {
    if (!userCoords) return savedStops;
    return [...savedStops].sort((a, b) => {
      const ca = stopCoordsByCode[a.code];
      const cb = stopCoordsByCode[b.code];
      if (!ca && !cb) return 0;
      if (!ca) return 1;
      if (!cb) return -1;
      const da = getDistanceMeters(userCoords[0], userCoords[1], ca.lat, ca.lon);
      const db = getDistanceMeters(userCoords[0], userCoords[1], cb.lat, cb.lon);
      return da - db;
    });
  }, [savedStops, userCoords, stopCoordsByCode]);

  useEffect(() => {
    if (!isOpen || savedStops.length === 0) return;
    let cancelled = false;
    const codes = sortedStops.slice(0, 5).map((s) => s.code);

    (async () => {
      setArrivalsLoading(true);
      const next: Record<string, StopArrivalPreview[]> = {};
      await Promise.all(
        codes.map(async (code) => {
          try {
            const res = await fetch(`/api/stops/arrivals?stop=${code}`);
            if (!res.ok) return;
            const data = await res.json();
            const list = Array.isArray(data.arrivals) ? data.arrivals : [];
            next[code] = list.slice(0, 3).map((a: StopArrivalPreview) => ({
              line: a.line,
              minutesRemaining: a.minutesRemaining,
              realtime: a.realtime,
              statusText: a.statusText,
            }));
          } catch {
            /* ignore single stop */
          }
        })
      );
      if (!cancelled) {
        setArrivalsByStop(next);
        setArrivalsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, savedStops, sortedStops]);

  if (!isOpen) return null;

  const empty = savedLines.length === 0 && savedStops.length === 0;

  const formatDistance = (code: string) => {
    if (!userCoords) return null;
    const c = stopCoordsByCode[code];
    if (!c) return null;
    const m = getDistanceMeters(userCoords[0], userCoords[1], c.lat, c.lon);
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  };

  const panel = (
    <div
      className={`${
        hosted ? "" : "relative"
      } bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden pb-safe animate-in slide-in-from-bottom duration-200`}
    >
      <div className="w-full flex justify-center pt-2.5 pb-1" onClick={onClose}>
        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
      </div>

      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center">
            <Star className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">
              Preferiti
            </h2>
            <p className="text-[11px] text-slate-500">
              Linee, fermate e prossimi arrivi
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full active:bg-slate-100 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto px-4 py-3 flex-1 space-y-4">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onLocateMe?.();
              onClose();
            }}
            className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-left active:bg-slate-100"
          >
            <Navigation className="w-4 h-4 text-[#0B5FFF] shrink-0" />
            <span className="text-xs font-bold text-slate-800 leading-tight">
              Centra su di me
            </span>
          </button>
          <Link
            href="/aggiornamenti"
            onClick={onClose}
            className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2.5 text-left active:bg-slate-100"
          >
            <Bell className="w-4 h-4 text-[#0B5FFF] shrink-0" />
            <span className="text-xs font-bold text-slate-800 leading-tight">
              Notifiche / idea
            </span>
          </Link>
        </div>

        {(recent.lines.length > 0 || recent.stops.length > 0) && (
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#0B5FFF]" />
              Ultime usate
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {recent.lines.map((line) => (
                <button
                  key={`recent-line-${line}`}
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectLine(line);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black text-white"
                  style={{ backgroundColor: lineColor(line) }}
                >
                  {isMetro(line) ? "M1" : line}
                </button>
              ))}
            </div>
            {recent.stops.length > 0 && (
              <div className="space-y-1">
                {recent.stops.slice(0, 4).map((stop) => (
                  <button
                    key={`recent-stop-${stop.code}`}
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectStop(stop.code);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[11px] font-semibold text-slate-800 truncate"
                  >
                    {stop.name}
                    <span className="text-slate-400 font-medium">
                      {" "}
                      · #{stop.code}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {empty && (
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-3.5 py-3">
            <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Inizia da qui
            </div>
            <p className="text-[11px] text-amber-800/90 mb-2.5">
              Salva le linee che prendi spesso: le trovi subito e vedi quanti
              mezzi sono in diretta.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_LINES.map((line) => (
                <button
                  key={line}
                  type="button"
                  onClick={() => onToggleLineFavorite(line)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black text-white"
                  style={{ backgroundColor: lineColor(line) }}
                >
                  + {isMetro(line) ? "M1" : line}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Bus className="w-3.5 h-3.5 text-[#0B5FFF]" />
            Linee
            {savedLines.length > 0 && (
              <span className="normal-case font-semibold text-slate-400">
                · {savedLines.length}
              </span>
            )}
          </div>
          {savedLines.length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
              Nessuna linea salvata. Tocca una stella in ricerca o usa i
              suggerimenti sopra.
            </p>
          ) : (
            <div className="space-y-1.5">
              {savedLines.map((line) => {
                const live = liveLineCounts[line] ?? liveLineCounts[line.toUpperCase()] ?? 0;
                return (
                  <div
                    key={line}
                    className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 pl-2.5 pr-1.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onSelectLine(line);
                      }}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                    >
                      <span
                        className="w-10 h-8 rounded-lg text-white text-xs font-black flex items-center justify-center shrink-0"
                        style={{ backgroundColor: lineColor(line) }}
                      >
                        {isMetro(line) ? "M1" : line}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900">
                          Linea {isMetro(line) ? "Metro M1" : line}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Radio className="w-3 h-3" />
                          {live > 0
                            ? `${live} in diretta ora`
                            : "Nessun mezzo live al momento"}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleLineFavorite(line)}
                      className="p-2 text-slate-400 active:text-red-500"
                      title="Rimuovi"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0B5FFF]" />
            Fermate
            {userCoords && savedStops.length > 0 && (
              <span className="normal-case font-semibold text-slate-400">
                · più vicine prima
              </span>
            )}
          </div>
          {savedStops.length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
              Nessuna fermata salvata. Apri una fermata sulla mappa e tocca la
              stella.
            </p>
          ) : (
            <div className="space-y-2">
              {arrivalsLoading && (
                <p className="text-[10px] text-slate-400 px-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Carico i prossimi arrivi…
                </p>
              )}
              {sortedStops.map((stop) => {
                const dist = formatDistance(stop.code);
                const arrivals = arrivalsByStop[stop.code] || [];
                return (
                  <div
                    key={stop.code}
                    className="rounded-2xl border border-slate-100 bg-slate-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-2.5 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onSelectStop(stop.code);
                        }}
                        className="text-left flex-1 min-w-0"
                      >
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {stop.name}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span>#{stop.code}</span>
                          {dist && (
                            <>
                              <span>·</span>
                              <span className="font-semibold text-[#0B5FFF]">
                                {dist}
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStopFavorite(stop)}
                        className="p-1.5 text-slate-400 active:text-red-500 shrink-0"
                        title="Rimuovi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {arrivals.length > 0 && (
                      <div className="px-2.5 pb-2.5 flex flex-wrap gap-1.5">
                        {arrivals.map((a, i) => (
                          <span
                            key={`${stop.code}-${a.line}-${i}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700"
                          >
                            <span
                              className="w-5 h-5 rounded-md text-white text-[9px] flex items-center justify-center"
                              style={{ backgroundColor: lineColor(a.line) }}
                            >
                              {a.line.slice(0, 3)}
                            </span>
                            {a.minutesRemaining <= 0
                              ? "in arrivo"
                              : `${a.minutesRemaining} min`}
                            {a.realtime && (
                              <span className="text-emerald-600 font-black">
                                ·
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
