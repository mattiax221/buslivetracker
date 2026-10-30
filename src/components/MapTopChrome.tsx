"use client";

import { AlertTriangle } from "lucide-react";

interface MapTopChromeProps {
  alertsCount: number;
  isLive?: boolean;
  onOpenAlerts: () => void;
}

export default function MapTopChrome({
  alertsCount,
  isLive = true,
  onOpenAlerts,
}: MapTopChromeProps) {
  return (
    <header className="map-top-chrome pt-safe pointer-events-none chrome-enter">
      <div className="pointer-events-auto mx-3 mt-2 flex items-center justify-between gap-2 rounded-2xl gtt-chrome backdrop-blur-xl border px-3 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl overflow-hidden bg-[#0B5FFF] shrink-0 shadow-sm shadow-blue-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="font-black tracking-tight text-[15px] leading-none">
              GTT Live
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`live-dot ${isLive ? "live-dot--on" : "live-dot--off"}`}
                aria-hidden
              />
              <span className="text-[10px] font-semibold opacity-60">
                {isLive ? "In diretta" : "In collegamento…"}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenAlerts}
          className="relative w-9 h-9 rounded-full bg-black/5 dark-btn border border-black/10 active:scale-90 transition-transform flex items-center justify-center shrink-0"
          title="Avvisi e deviazioni GTT"
          aria-label="Avvisi GTT"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          {alertsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] rounded-full font-black border border-white flex items-center justify-center animate-in zoom-in duration-200">
              {alertsCount > 99 ? "99+" : alertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
