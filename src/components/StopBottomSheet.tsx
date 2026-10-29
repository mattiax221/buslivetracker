"use client";

import { useEffect, useState, useCallback } from "react";
import { X, RefreshCw, Clock, Radio, Bus, TramFront as Tram, Star } from "lucide-react";

interface StopArrival {
  line: string;
  hour: string;
  minutesRemaining: number;
  realtime: boolean;
  statusText: string;
}

interface StopInfo {
  code: string;
  name: string;
  desc?: string;
  lat: number;
  lon: number;
}

interface StopBottomSheetProps {
  stop: StopInfo | null;
  onClose: () => void;
  onSelectLine?: (line: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (stop: { code: string; name: string }) => void;
}

function isTramLine(line: string): boolean {
  const clean = line.replace(/\s+/g, "").toUpperCase();
  return ["3", "4", "7", "9", "9B", "10", "13", "15", "16CD", "16CS", "79"].includes(clean);
}

export default function StopBottomSheet({
  stop,
  onClose,
  onSelectLine,
  isFavorite,
  onToggleFavorite,
}: StopBottomSheetProps) {
  const [arrivals, setArrivals] = useState<StopArrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const fetchArrivals = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stops/arrivals?stop=${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setArrivals(data.arrivals || []);
      setLastRefreshed(
        new Date().toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    } catch {
      setError("Impossibile caricare gli arrivi in tempo reale.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!stop?.code) {
      setArrivals([]);
      return;
    }
    fetchArrivals(stop.code);

    const interval = setInterval(() => fetchArrivals(stop.code), 20000);
    return () => clearInterval(interval);
  }, [stop?.code, fetchArrivals]);

  if (!stop) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] transition-transform animate-in slide-in-from-bottom duration-200">
      <div
        className="fixed inset-0 bg-black/20 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[75vh] flex flex-col pb-safe">
        {/* Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="bg-slate-900 text-white text-[11px] font-black px-2 py-0.5 rounded-md">
                Palina #{stop.code}
              </span>
              <span className="text-xs text-gray-400">
                {lastRefreshed ? `Agg. ${lastRefreshed}` : ""}
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {stop.name}
            </h2>
            {stop.desc && (
              <p className="text-xs text-gray-500 truncate">{stop.desc}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {stop && onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite({ code: stop.code, name: stop.name })}
                className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors"
                title={isFavorite ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
              >
                <Star
                  className={`w-4 h-4 ${
                    isFavorite ? "text-amber-500 fill-amber-500" : "text-gray-400"
                  }`}
                />
              </button>
            )}

            <button
              onClick={() => fetchArrivals(stop.code)}
              disabled={loading}
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-600 disabled:opacity-50"
              title="Aggiorna arrivi"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Arrivals list */}
        <div className="overflow-y-auto px-4 py-3 space-y-2.5 flex-1 overscroll-contain">
          {loading && arrivals.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Ricerca passaggi in tempo reale...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs text-center">
              {error}
            </div>
          ) : arrivals.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-xs">
              Nessun passaggio previsto nei prossimi 60 minuti per questa fermata.
            </div>
          ) : (
            arrivals.map((arr, idx) => {
              const isUrgent = arr.minutesRemaining <= 3;
              const isClose = arr.minutesRemaining <= 8;
              const isTram = isTramLine(arr.line);

              return (
                <div
                  key={`${arr.line}-${arr.hour}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  onClick={() => onSelectLine?.(arr.line)}
                >
                  {/* Left: Line Badge */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-10 rounded-xl text-white flex items-center justify-center font-black text-sm shadow-sm ${
                        isTram ? "bg-red-600" : "bg-slate-900"
                      }`}
                    >
                      {arr.line}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        {isTram ? (
                          <Tram className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <Bus className="w-3.5 h-3.5 text-slate-700" />
                        )}
                        <span>Linea {arr.line}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        {arr.realtime ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            GPS Live
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Orario previsto</span>
                        )}
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-500 font-medium text-[11px]">{arr.hour}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: ETA Badge */}
                  <div className="text-right">
                    {arr.minutesRemaining === 0 ? (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-white animate-pulse shadow-sm">
                        IN ARRIVO
                      </span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-lg font-black leading-none ${
                            isUrgent
                              ? "text-amber-600"
                              : isClose
                              ? "text-blue-600"
                              : "text-gray-800"
                          }`}
                        >
                          {arr.minutesRemaining}
                          <span className="text-xs font-medium ml-0.5">min</span>
                        </span>
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {arr.realtime ? "attesa stimata" : "da tabella"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
