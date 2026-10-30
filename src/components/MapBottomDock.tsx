"use client";

import { useEffect, useRef, useState } from "react";
import {
  LocateFixed,
  Star,
  MoreHorizontal,
  MapPin,
  Info,
  X,
  Accessibility,
  Shield,
  Newspaper,
  RefreshCw,
} from "lucide-react";

interface NearestStopInfo {
  stop: { code: string; name: string; lat: number; lon: number };
  distance: number;
}

interface MapBottomDockProps {
  nearestStop: NearestStopInfo | null;
  showNearestChip: boolean;
  favoritesCount: number;
  showEstimated: boolean;
  onToggleEstimated: () => void;
  onLocate: () => void;
  onRefreshVehicles: () => void;
  refreshing?: boolean;
  onOpenFavorites: () => void;
  onOpenMetro: () => void;
  onOpenAbout: () => void;
  onSelectNearest: () => void;
  /** Hide while a sheet is open so it can't slide under the viewport */
  sheetOpen?: boolean;
}

export default function MapBottomDock({
  nearestStop,
  showNearestChip,
  favoritesCount,
  showEstimated,
  onToggleEstimated,
  onLocate,
  onRefreshVehicles,
  refreshing = false,
  onOpenFavorites,
  onOpenMetro,
  onOpenAbout,
  onSelectNearest,
  sheetOpen = false,
}: MapBottomDockProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !legendOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setLegendOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen, legendOpen]);

  useEffect(() => {
    if (sheetOpen) {
      setMenuOpen(false);
      setLegendOpen(false);
    }
  }, [sheetOpen]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[1000] pb-safe dock-enter transition-opacity duration-150 ${
        sheetOpen ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-none"
      }`}
      aria-hidden={sheetOpen}
    >
      <div
        className={`px-3 pb-3 space-y-2 ${sheetOpen ? "pointer-events-none" : "pointer-events-auto"}`}
        ref={menuRef}
      >
        {showNearestChip && nearestStop && (
          <button
            onClick={onSelectNearest}
            className="w-full bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 shadow-xl flex items-center justify-between active:scale-[0.99] active:bg-slate-800 transition-all"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0B5FFF] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-xs font-bold truncate">
                  Fermata più vicina ({nearestStop.distance}m)
                </div>
                <div className="text-[11px] text-slate-300 truncate">
                  {nearestStop.stop.name} (#{nearestStop.stop.code})
                </div>
              </div>
            </div>
            <span className="text-xs font-bold bg-white/10 px-2.5 py-1 rounded-xl shrink-0">
              Orari →
            </span>
          </button>
        )}

        {legendOpen && (
          <div className="bg-white rounded-2xl p-3.5 shadow-xl border border-slate-100 text-xs space-y-2.5 max-w-sm ml-auto">
            <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-100 pb-1.5">
              <span>Legenda</span>
              <button onClick={() => setLegendOpen(false)} className="text-slate-400 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-red-600 shrink-0" />
                <span>Tram</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#0B5FFF] shrink-0" />
                <span>Autobus GTT</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-rose-600 shrink-0" />
                <span>Metro M1 (simulata, non GPS)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md border border-dashed border-amber-500 bg-amber-400 shrink-0" />
                <span>Stimata da orari (senza GPS)</span>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 text-[11px]">
                  Mezzi programmati (senza GPS)
                </div>
                <div className="text-[10px] text-slate-400 leading-snug">
                  Di default vedi solo GPS verificato. Attivali se ti servono.
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleEstimated}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors shrink-0 ${
                  showEstimated ? "bg-amber-500" : "bg-slate-300"
                }`}
                aria-pressed={showEstimated}
                aria-label="Mostra mezzi programmati senza GPS"
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transition-transform ${
                    showEstimated ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {menuOpen && !legendOpen && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden ml-auto w-[220px]">
            <button
              onClick={() => {
                setMenuOpen(false);
                setLegendOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left text-sm font-semibold text-slate-800 active:bg-slate-50 border-b border-slate-100"
            >
              <Info className="w-4 h-4 text-[#0B5FFF]" />
              Legenda & stime
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenMetro();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left text-sm font-semibold text-slate-800 active:bg-slate-50 border-b border-slate-100"
            >
              <Accessibility className="w-4 h-4 text-rose-600" />
              Ascensori Metro M1
            </button>
            <a
              href="/aggiornamenti"
              className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left text-sm font-semibold text-slate-800 active:bg-slate-50 border-b border-slate-100"
              onClick={() => setMenuOpen(false)}
            >
              <Newspaper className="w-4 h-4 text-[#0B5FFF]" />
              Aggiornamenti
            </a>
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenAbout();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left text-sm font-semibold text-slate-800 active:bg-slate-50 border-b border-slate-100"
            >
              <Shield className="w-4 h-4 text-slate-600" />
              Info & Privacy
            </button>
            <a
              href="https://github.com/mattiax221/buslivetracker"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left text-sm font-semibold text-slate-800 active:bg-slate-50"
              onClick={() => setMenuOpen(false)}
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        )}

        <nav className="bg-white/92 backdrop-blur-xl rounded-2xl border border-white/60 shadow-[0_10px_40px_rgba(15,23,42,0.14)] flex items-stretch overflow-hidden">
          <button
            onClick={onLocate}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 active:scale-[0.97] active:bg-slate-50/80 text-slate-700 transition-transform"
          >
            <LocateFixed className="w-5 h-5 text-[#0B5FFF]" />
            <span className="text-[10px] font-bold">Vicino</span>
          </button>
          <div className="w-px bg-slate-200/80 my-2" />
          <button
            type="button"
            onClick={onRefreshVehicles}
            disabled={refreshing}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 active:scale-[0.97] active:bg-slate-50/80 text-slate-700 transition-transform disabled:opacity-60"
            aria-label="Aggiorna posizione mezzi"
          >
            <RefreshCw
              className={`w-5 h-5 text-[#0B5FFF] ${refreshing ? "animate-spin" : ""}`}
            />
            <span className="text-[10px] font-bold">
              {refreshing ? "Attendi" : "Aggiorna"}
            </span>
          </button>
          <div className="w-px bg-slate-200/80 my-2" />
          <button
            onClick={onOpenFavorites}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 active:scale-[0.97] active:bg-slate-50/80 text-slate-700 relative transition-transform"
          >
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-bold">Preferiti</span>
            {favoritesCount > 0 && (
              <span className="absolute top-1.5 right-[22%] min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] rounded-full font-black flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>
          <div className="w-px bg-slate-200/80 my-2" />
          <button
            onClick={() => {
              setLegendOpen(false);
              setMenuOpen((v) => !v);
            }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 active:scale-[0.97] active:bg-slate-50/80 text-slate-700 transition-transform"
          >
            <MoreHorizontal className="w-5 h-5 text-slate-600" />
            <span className="text-[10px] font-bold">Altro</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
