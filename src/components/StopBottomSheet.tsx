"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  RefreshCw,
  Clock,
  Radio,
  Bus,
  TramFront as Tram,
  Star,
  Share2,
  Radar,
} from "lucide-react";
import {
  isStopWatched,
  unwatchStop,
  watchStop,
} from "../lib/gpsStopWatch";

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
  onShareStop?: (data: { title: string; text: string; url: string }) => void;
  /** Parent SheetHost owns backdrop */
  hosted?: boolean;
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
  onShareStop,
  hosted = false,
}: StopBottomSheetProps) {
  const [arrivals, setArrivals] = useState<StopArrival[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [gpsWatchOn, setGpsWatchOn] = useState(false);
  const [watchMsg, setWatchMsg] = useState<string | null>(null);

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
      setGpsWatchOn(false);
      setWatchMsg(null);
      return;
    }
    setGpsWatchOn(isStopWatched(stop.code));
    setWatchMsg(null);
    fetchArrivals(stop.code);

    const interval = setInterval(() => fetchArrivals(stop.code), 20000);
    return () => clearInterval(interval);
  }, [stop?.code, fetchArrivals]);

  // Keep line filter fresh while watching
  useEffect(() => {
    if (!stop || !gpsWatchOn || arrivals.length === 0) return;
    const lines = [
      ...new Set(arrivals.slice(0, 8).map((a) => a.line).filter(Boolean)),
    ];
    if (lines.length === 0) return;
    watchStop({
      code: stop.code,
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      lines,
    });
  }, [arrivals, gpsWatchOn, stop]);

  const toggleGpsWatch = async () => {
    if (!stop) return;
    if (gpsWatchOn) {
      unwatchStop(stop.code);
      setGpsWatchOn(false);
      setWatchMsg("Avviso GPS disattivato per questa fermata.");
      return;
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      setWatchMsg("Serve il permesso notifiche (Aggiornamenti → Notifiche).");
      return;
    }
    const lines = [
      ...new Set(arrivals.slice(0, 8).map((a) => a.line).filter(Boolean)),
    ];
    watchStop({
      code: stop.code,
      name: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      lines: lines.length ? lines : undefined,
    });
    setGpsWatchOn(true);
    setWatchMsg(
      lines.length
        ? `Ok: ti avviso quando un mezzo GPS delle linee ${lines.slice(0, 4).join(", ")} si avvicina (non sull’orario). Max 2 fermate.`
        : "Ok: ti avviso quando un mezzo GPS si avvicina a questa palina."
    );
  };

  if (!stop) return null;

  const panel = (
      <div className="bg-white rounded-t-3xl shadow-2xl border-t border-gray-100 max-h-[min(75dvh,100%)] flex flex-col overflow-hidden pb-safe animate-in slide-in-from-bottom duration-200">
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

            {stop && onShareStop && (
              <button
                onClick={() => {
                  const arrSummary = arrivals.length > 0
                    ? "\nProssimi passaggi:\n" + arrivals.slice(0, 3).map((a) => `• Linea ${a.line}: ${a.minutesRemaining <= 0 ? "In arrivo" : `${a.minutesRemaining} min`} (${a.hour})`).join("\n")
                    : "";
                  onShareStop({
                    title: `Fermata ${stop.name} (#${stop.code})`,
                    text: `📍 Orari in tempo reale per la fermata ${stop.name} (Palina #${stop.code}) a Torino:${arrSummary}`,
                    url: typeof window !== "undefined" ? `${window.location.origin}/?stop=${stop.code}` : "https://github.com/mattiax221/buslivetracker",
                  });
                }}
                className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 text-gray-600 transition-colors"
                title="Condividi orari fermata su WhatsApp / Telegram"
              >
                <Share2 className="w-4 h-4" />
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

        <div className="px-4 pt-2.5 pb-1">
          <button
            type="button"
            onClick={() => void toggleGpsWatch()}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border ${
              gpsWatchOn
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-50 border-slate-200 text-slate-800"
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            {gpsWatchOn
              ? "Avviso GPS attivo — tocca per spegnere"
              : "Avvisami al GPS (mezzo in avvicinamento)"}
          </button>
          {watchMsg && (
            <p className="text-[10px] text-slate-500 mt-1.5 leading-snug px-0.5">
              {watchMsg}
            </p>
          )}
        </div>

        {/* Arrivals list */}
        <div className="overflow-y-auto px-4 py-3 space-y-2.5 flex-1 overscroll-contain">
          {loading && arrivals.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-gray-400 gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Ricerca passaggi in tempo reale...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-xl text-xs text-center space-y-2">
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => stop?.code && fetchArrivals(stop.code)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold active:scale-95"
              >
                Riprova
              </button>
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
  );

  if (hosted) return panel;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100]">
      <div
        className="fixed inset-0 bg-black/20 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />
      {panel}
    </div>
  );
}
