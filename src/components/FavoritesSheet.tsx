"use client";

import { Star, Trash2, X, MapPin, Bus } from "lucide-react";

interface FavoritesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  savedLines: string[];
  savedStops: { code: string; name: string }[];
  onToggleLineFavorite: (line: string) => void;
  onToggleStopFavorite: (stop: { code: string; name: string }) => void;
  onSelectLine: (line: string) => void;
  onSelectStop: (code: string) => void;
  /** When true, parent SheetHost owns backdrop / fixed shell */
  hosted?: boolean;
}

export default function FavoritesSheet({
  isOpen,
  onClose,
  savedLines,
  savedStops,
  onToggleLineFavorite,
  onToggleStopFavorite,
  onSelectLine,
  onSelectStop,
  hosted = false,
}: FavoritesSheetProps) {
  if (!isOpen) return null;

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
              Linee e fermate salvate
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
        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Bus className="w-3.5 h-3.5 text-[#0B5FFF]" />
            Linee
          </div>
          {savedLines.length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
              Nessuna linea salvata. Usa la stella sulla fermata o salva dalla
              ricerca.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedLines.map((line) => (
                <div
                  key={line}
                  className="flex items-center gap-2 bg-slate-900 text-white pl-3 pr-1.5 py-1.5 rounded-xl"
                >
                  <button
                    onClick={() => {
                      onClose();
                      onSelectLine(line);
                    }}
                    className="font-black text-xs"
                  >
                    Linea {line}
                  </button>
                  <button
                    onClick={() => onToggleLineFavorite(line)}
                    className="p-1 text-slate-300 active:text-red-400"
                    title="Rimuovi"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#0B5FFF]" />
            Fermate
          </div>
          {savedStops.length === 0 ? (
            <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
              Nessuna fermata salvata. Apri una fermata e tocca la stella.
            </p>
          ) : (
            <div className="space-y-1.5">
              {savedStops.map((stop) => (
                <div
                  key={stop.code}
                  className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <button
                    onClick={() => {
                      onClose();
                      onSelectStop(stop.code);
                    }}
                    className="text-left flex-1 min-w-0 pr-2"
                  >
                    <div className="font-bold text-xs text-slate-900 truncate">
                      {stop.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Palina #{stop.code}
                    </div>
                  </button>
                  <button
                    onClick={() => onToggleStopFavorite(stop)}
                    className="p-1 text-slate-400 active:text-red-500"
                    title="Rimuovi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
