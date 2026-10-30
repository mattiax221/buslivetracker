"use client";

import { useState } from "react";
import {
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  Radio,
} from "lucide-react";
import { METRO_M1_ACCESSIBILITY, StationAccessibility } from "../lib/metroAccessibility";

interface MetroAccessibilitySheetProps {
  isOpen: boolean;
  onClose: () => void;
  onFocusStation?: (stationCode: string) => void;
  hosted?: boolean;
}

export default function MetroAccessibilitySheet({
  isOpen,
  onClose,
  onFocusStation,
  hosted = false,
}: MetroAccessibilitySheetProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "warnings">("all");

  if (!isOpen) return null;

  const filteredStations = METRO_M1_ACCESSIBILITY.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      st.address.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === "warnings") {
      return (
        st.elevators.streetToAtrium !== "OPERATIONAL" ||
        st.elevators.atriumToFermi !== "OPERATIONAL" ||
        st.elevators.atriumToBengasi !== "OPERATIONAL" ||
        st.escalators.status !== "OPERATIONAL" ||
        !!st.note
      );
    }
    return true;
  });

  const totalOperational = METRO_M1_ACCESSIBILITY.filter(
    (s) =>
      s.elevators.streetToAtrium === "OPERATIONAL" &&
      s.elevators.atriumToFermi === "OPERATIONAL" &&
      s.elevators.atriumToBengasi === "OPERATIONAL"
  ).length;

  const panel = (
      <div
        className="w-full max-w-lg mx-auto gtt-sheet rounded-t-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[min(88dvh,100%)] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50/50 via-white to-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200 font-bold text-base">
              ♿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-gray-900">
                  Accessibilità & Impianti Metro M1
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                  Riferimento
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Dati statici di riferimento — non aggiornati in tempo reale
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

        {/* Global Summary Badge */}
        <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold">
              {totalOperational} su 23 Stazioni con tutti gli impianti al 100%
            </span>
          </div>
          <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-md">
            PMR 100%
          </span>
        </div>

        {/* Search & Filter pills */}
        <div className="p-3 border-b border-gray-100 space-y-2 bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca fermata metro (es. Porta Nuova, Spezia, Fermi)..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterMode === "all"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              Tutte le 23 stazioni
            </button>
            <button
              onClick={() => setFilterMode("warnings")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                filterMode === "warnings"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Avvisi / Manutenzione</span>
            </button>
          </div>
        </div>

        {/* Stations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-gray-100">
          {filteredStations.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs">
              Nessuna stazione corrisponde alla ricerca
            </div>
          ) : (
            filteredStations.map((station) => (
              <div key={station.code} className="pt-2.5 first:pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-900">{station.name}</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.2 rounded">
                        M1
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{station.address}</div>
                  </div>

                  {onFocusStation && (
                    <button
                      onClick={() => {
                        onFocusStation(station.code);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Mappa</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Status Pills */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  {/* Street - Atrium Elevator */}
                  <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        station.elevators.streetToAtrium === "OPERATIONAL"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-gray-500 text-[10px]">Ascensore Strada ↔ Atrio</div>
                      <div className="font-bold text-gray-800">
                        {station.elevators.streetToAtrium === "OPERATIONAL"
                          ? "In Servizio"
                          : "Manutenzione"}
                      </div>
                    </div>
                  </div>

                  {/* Atrium - Platforms Elevators */}
                  <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        station.elevators.atriumToFermi === "OPERATIONAL" &&
                        station.elevators.atriumToBengasi === "OPERATIONAL"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-gray-500 text-[10px]">Ascensori Banchine</div>
                      <div className="font-bold text-gray-800">
                        {station.elevators.atriumToFermi === "OPERATIONAL" &&
                        station.elevators.atriumToBengasi === "OPERATIONAL"
                          ? "Entrambi OK"
                          : "1 in Revisione"}
                      </div>
                    </div>
                  </div>

                  {/* Escalators */}
                  <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        station.escalators.status === "OPERATIONAL"
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-gray-500 text-[10px]">Scale Mobili</div>
                      <div className="font-bold text-gray-800">
                        {station.escalators.operational}/{station.escalators.total} Operative
                      </div>
                    </div>
                  </div>

                  {/* Tactile & PMR */}
                  <div className="p-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <div className="truncate">
                      <div className="text-gray-500 text-[10px]">Percorsi Tattili</div>
                      <div className="font-bold text-gray-800">Loges + SOS Attivi</div>
                    </div>
                  </div>
                </div>

                {/* Specific Notes if any */}
                {station.note && (
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200/60 text-[11px] text-amber-900 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{station.note}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
  );

  if (hosted) return panel;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/40 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>{panel}</div>
    </div>
  );
}

