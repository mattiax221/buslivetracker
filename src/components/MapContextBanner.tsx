"use client";

import { Share2, X } from "lucide-react";
import { isMetro, lineColor } from "../lib/mapUtils";

interface MapContextBannerProps {
  line: string;
  headsign?: string;
  isEstimated?: boolean;
  notice?: string;
  onShare: () => void;
  onFit: () => void;
  onClear: () => void;
}

export default function MapContextBanner({
  line,
  headsign,
  isEstimated,
  notice,
  onShare,
  onFit,
  onClear,
}: MapContextBannerProps) {
  return (
    <div className="mx-3 mt-2 pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2 rounded-2xl shadow-xl flex items-center justify-between gap-2.5 pointer-events-auto border border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: lineColor(line) }}
          />
          <div className="min-w-0 text-xs">
            <span className="font-black">
              {isMetro(line) ? "Metro M1" : `Linea ${line}`}
            </span>
            {isEstimated && (
              <span className="text-[10px] bg-amber-500/25 text-amber-300 font-bold px-1.5 py-0.5 rounded ml-1.5">
                Stima
              </span>
            )}
            {headsign && (
              <span className="text-slate-300 font-normal ml-1.5 truncate">
                → {headsign}
              </span>
            )}
            {notice && (
              <span className="block text-[10px] font-bold text-amber-300 truncate">
                {notice}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onShare}
            className="px-2 py-1 rounded-xl bg-emerald-600/90 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1"
            title="Condividi"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onFit}
            className="px-2.5 py-1 rounded-xl bg-white/15 active:scale-95 text-white text-[11px] font-bold"
          >
            Inquadra
          </button>
          <button
            onClick={onClear}
            className="p-1.5 rounded-xl bg-red-600/90 active:scale-95 text-white"
            title="Mostra tutti"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
