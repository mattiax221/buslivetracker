"use client";

import { useMemo, useState } from "react";
import {
  Bus,
  TramFront as Tram,
  Search,
  X,
  ChevronDown,
  MapPin,
  Info,
  TrainTrack,
  ArrowRight,
  Star,
} from "lucide-react";
import { StopData } from "./StopsLayer";
import {
  isMetro,
  isTram,
  lineColor,
  naturalSort,
} from "../lib/mapUtils";

interface StopInfo {
  code: string;
  name: string;
  desc?: string;
  lat: number;
  lon: number;
}

interface MapSearchPanelProps {
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
  onSelectStopByCode: (code: string, name?: string) => void;
  selectedDirection: string | null;
  onSelectDirection: (dir: string | null) => void;
  availableDirections: { dir: string; headsign: string }[];
}

export default function MapSearchPanel({
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
  onSelectStopByCode,
  selectedDirection,
  onSelectDirection,
  availableDirections,
}: MapSearchPanelProps) {
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
  const isMetroMatching =
    !search.trim() ||
    search.trim().toLowerCase().includes("m") ||
    search.trim().toLowerCase().includes("metro");

  return (
    <div className="mx-3 mt-2 pointer-events-none">
      <div className="pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Linea o fermata…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (!expanded) setExpanded(true);
              }}
              onFocus={() => setExpanded(true)}
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400"
            />
            {search ? (
              <button
                onClick={() => setSearch("")}
                className="p-1 rounded-full text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                {isFiltering ? `${filteredCount}/${totalCount}` : totalCount}
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg active:bg-slate-100"
            >
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {expanded && (
            <div className="border-t border-slate-100 bg-white">
              {matchingStops.length > 0 && (
                <div className="p-2 border-b border-slate-100 bg-blue-50/40">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Fermate
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
                        className="w-full text-left px-3 py-2 rounded-xl bg-white active:bg-blue-50 flex items-center justify-between border border-blue-100/60"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {st.n}
                            </span>
                            <span className="bg-[#0B5FFF] text-white text-[10px] font-bold px-1.5 rounded">
                              #{st.c}
                            </span>
                          </div>
                          {st.d && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {st.d}
                            </p>
                          )}
                        </div>
                        <span className="text-[#0B5FFF] text-xs font-bold ml-2">
                          Arrivi →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-slate-50/80">
                {isFiltering ? (
                  <button
                    onClick={onClearLines}
                    className="text-red-500 font-bold"
                  >
                    Annulla filtro
                  </button>
                ) : (
                  <span className="text-slate-400">Filtra per mezzo</span>
                )}
                <button
                  onClick={() => setExpanded(false)}
                  className="text-[#0B5FFF] font-semibold"
                >
                  Chiudi
                </button>
              </div>

              <div className="px-3 pb-3 pt-2 max-h-52 overflow-y-auto">
                {isMetroMatching && (
                  <>
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <TrainTrack className="w-3.5 h-3.5" />
                      Metropolitana
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        onClick={() => onToggleLine("M1")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                          selectedLines.has("M1")
                            ? "bg-rose-600 text-white shadow-md"
                            : isFiltering
                            ? "bg-slate-100 text-slate-400"
                            : "bg-rose-50 text-rose-900 border border-rose-200"
                        }`}
                      >
                        <TrainTrack className="w-3.5 h-3.5" />
                        M1 Fermi ↔ Bengasi
                      </button>
                    </div>
                  </>
                )}

                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Tram className="w-3.5 h-3.5" />
                  Tram
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
                            ? "text-white shadow-md"
                            : isFiltering
                            ? "bg-slate-100 text-slate-400"
                            : "bg-red-50 text-red-900 border border-red-100"
                        }`}
                        style={active ? { backgroundColor: "#dc2626" } : undefined}
                      >
                        {line}
                      </button>
                    );
                  })}
                </div>

                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5" />
                  Autobus
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchingLines
                    .filter((l) => !isTram(l) && !isMetro(l))
                    .map((line) => {
                      const active = selectedLines.has(line);
                      return (
                        <button
                          key={line}
                          onClick={() => onToggleLine(line)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            active
                              ? "text-white shadow-md"
                              : isFiltering
                              ? "bg-slate-100 text-slate-400"
                              : "bg-slate-100 text-slate-800"
                          }`}
                          style={
                            active ? { backgroundColor: lineColor(line) } : undefined
                          }
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

        {selectedLines.size > 0 && filteredCount === 0 && (
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 shadow-md flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900 min-w-0">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="truncate">
                <span className="font-bold">
                  Linea {Array.from(selectedLines).join(", ")}
                </span>
                : nessun mezzo attivo.
              </div>
            </div>
            {hasShape && onFitRoute && (
              <button
                onClick={onFitRoute}
                className="px-2.5 py-1 rounded-xl bg-amber-600 text-white font-bold text-[11px] shrink-0"
              >
                Percorso
              </button>
            )}
          </div>
        )}
      </div>

      {!expanded && !isFiltering && (savedLines.length > 0 || savedStops.length > 0) && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
          {savedLines.map((line) => (
            <button
              key={`fav-line-${line}`}
              onClick={() => onToggleLine(line)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-md border border-slate-200 shrink-0"
            >
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{isMetro(line) ? "M1" : line}</span>
            </button>
          ))}
          {savedStops.map((st) => (
            <button
              key={`fav-stop-${st.code}`}
              onClick={() => onSelectStopByCode(st.code, st.name)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-md border border-slate-200 shrink-0"
            >
              <MapPin className="w-3 h-3 text-[#0B5FFF]" />
              <span className="truncate max-w-[110px]">{st.name}</span>
            </button>
          ))}
        </div>
      )}

      {!expanded && isFiltering && (
        <div className="mt-2 flex flex-col gap-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Array.from(selectedLines)
              .sort(naturalSort)
              .map((line) => (
                <button
                  key={line}
                  onClick={() => onToggleLine(line)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-md"
                  style={{ backgroundColor: lineColor(line) }}
                >
                  <span>{isMetro(line) ? "M1" : line}</span>
                  <span className="opacity-80">✕</span>
                </button>
              ))}
            {hasShape && onFitRoute && (
              <button
                onClick={onFitRoute}
                className="px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 bg-white shadow-md border border-slate-200"
              >
                Tracciato
              </button>
            )}
            <button
              onClick={onClearLines}
              className="px-2.5 py-1 rounded-full text-xs font-bold text-slate-600 bg-white shadow-md"
            >
              Reset
            </button>
          </div>

          {availableDirections.length > 1 && (
            <div className="flex items-center gap-1 bg-white/95 p-1 rounded-2xl shadow-md border border-slate-200 overflow-x-auto text-[11px] w-fit max-w-full">
              <button
                onClick={() => onSelectDirection(null)}
                className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap ${
                  selectedDirection === null
                    ? "bg-slate-900 text-white"
                    : "text-slate-600"
                }`}
              >
                Tutti
              </button>
              {availableDirections.map((d) => (
                <button
                  key={`dir-${d.dir}`}
                  onClick={() => onSelectDirection(d.dir)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap flex items-center gap-1 ${
                    selectedDirection === d.dir
                      ? "bg-[#0B5FFF] text-white"
                      : "text-slate-600"
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
