"use client";

import { useEffect, useState, useMemo } from "react";
import { AlertTriangle, AlertCircle, Search, X, Construction, Megaphone, Check } from "lucide-react";

export interface ServiceAlert {
  id: string;
  header: string;
  description: string;
  cause: string;
  effect: string;
  routes: string[];
  startsAt?: string;
  endsAt?: string;
}

interface AlertsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLine?: string;
  onSelectLine?: (line: string) => void;
}

export default function AlertsBottomSheet({
  isOpen,
  onClose,
  selectedLine,
  onSelectLine,
}: AlertsBottomSheetProps) {
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch("/api/alerts")
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data.alerts || []);
        if (selectedLine) {
          setSearch(selectedLine);
        }
      })
      .catch((err) => console.error("Error loading alerts:", err))
      .finally(() => setLoading(false));
  }, [isOpen, selectedLine]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filterType === "STRIKE" && !a.cause.includes("Sciopero") && !a.header.toLowerCase().includes("sciopero")) {
        return false;
      }
      if (filterType === "DETOUR" && !a.effect.includes("Deviazione") && !a.header.toLowerCase().includes("deviat")) {
        return false;
      }

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const matchHeader = a.header.toLowerCase().includes(q);
      const matchDesc = a.description.toLowerCase().includes(q);
      const matchRoute = a.routes.some((r) => r.toLowerCase().includes(q));
      return matchHeader || matchDesc || matchRoute;
    });
  }, [alerts, search, filterType]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col justify-end">
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden pb-safe animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                Avvisi, Deviazioni & Scioperi
              </h2>
              <p className="text-xs text-gray-500">
                Comunicazioni ufficiali GTT in tempo reale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter pills */}
        <div className="p-3 bg-gray-50/60 border-b border-gray-100 space-y-2">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-200 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Filtra per linea o parola (es. 77, 15, sciopero)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 text-xs outline-none bg-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-gray-400 hover:text-gray-600 px-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                filterType === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              Tutti ({alerts.length})
            </button>
            <button
              onClick={() => setFilterType("DETOUR")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterType === "DETOUR"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              <Construction className="w-3.5 h-3.5" />
              <span>Deviazioni</span>
            </button>
            <button
              onClick={() => setFilterType("STRIKE")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                filterType === "STRIKE"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Scioperi</span>
            </button>
          </div>
        </div>

        {/* List of alerts */}
        <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1 overscroll-contain">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Caricamento comunicazioni GTT...</p>
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              Nessun avviso trovato per i criteri selezionati.
            </div>
          ) : (
            filteredAlerts.map((al) => {
              const isStrike =
                al.cause.includes("Sciopero") ||
                al.header.toLowerCase().includes("sciopero");
              const isDetour =
                al.effect.includes("Deviazione") ||
                al.header.toLowerCase().includes("deviat");

              return (
                <div
                  key={al.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isStrike
                      ? "bg-rose-50/70 border-rose-200"
                      : isDetour
                      ? "bg-amber-50/70 border-amber-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isStrike
                            ? "bg-rose-600 text-white"
                            : isDetour
                            ? "bg-amber-600 text-white"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        {al.effect || al.cause}
                      </span>
                      {al.cause && (
                        <span className="text-[10px] text-gray-500 font-medium">
                          Motivo: {al.cause}
                        </span>
                      )}
                    </div>

                    {al.routes.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {al.routes.map((r) => (
                          <button
                            key={r}
                            onClick={() => {
                              onSelectLine?.(r);
                              onClose();
                            }}
                            className="bg-white text-gray-900 border border-gray-300 hover:border-gray-500 text-[10px] font-black px-1.5 py-0.5 rounded shadow-2xs"
                            title={`Filtra linea ${r}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-gray-900 leading-snug">
                    {al.header}
                  </h3>

                  {al.description && (
                    <p className="text-xs text-gray-700 mt-1.5 whitespace-pre-line leading-relaxed font-normal">
                      {al.description}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
