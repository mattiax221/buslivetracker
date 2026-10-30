"use client";

import { X, Route } from "lucide-react";
import {
  formatClock,
  formatDuration,
  itineraryTransitLines,
  type TripItinerary,
} from "../lib/tripPlan";
import { lineColor } from "../lib/mapUtils";

interface TripGuidanceBannerProps {
  itinerary: TripItinerary;
  fromName: string;
  toName: string;
  onClear: () => void;
  onFit: () => void;
}

export default function TripGuidanceBanner({
  itinerary,
  fromName,
  toName,
  onClear,
  onFit,
}: TripGuidanceBannerProps) {
  const lines = itineraryTransitLines(itinerary);

  return (
    <div className="mx-3 mt-2 pointer-events-none">
      <div className="bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-2xl shadow-xl pointer-events-auto border border-white/10 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex items-start gap-2">
            <Route className="w-4 h-4 text-[#5B9DFF] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-black truncate">
                {fromName} → {toName}
              </div>
              <div className="text-[10px] text-slate-300 font-medium">
                {formatDuration(itinerary.durationSec)} ·{" "}
                {formatClock(itinerary.startTime)}–
                {formatClock(itinerary.endTime)}
                {lines.length > 0 ? " · solo linee del percorso" : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded-lg bg-white/10 active:scale-95 shrink-0"
            aria-label="Chiudi indicazioni"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {lines.map((line) => (
            <span
              key={line}
              className="text-[10px] font-black px-2 py-0.5 rounded-md text-white"
              style={{ backgroundColor: lineColor(line) }}
            >
              {line}
            </span>
          ))}
          <button
            type="button"
            onClick={onFit}
            className="ml-auto text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white/15 active:scale-95"
          >
            Inquadra
          </button>
        </div>
      </div>
    </div>
  );
}
