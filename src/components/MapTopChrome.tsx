"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Coffee, X } from "lucide-react";

const KOFI_URL = "https://ko-fi.com/mattiax";
const TIP_STORAGE_KEY = "gtt_kofi_tip_seen_at";
/** Show the tip again after this many days. */
const TIP_COOLDOWN_DAYS = 2;
const TIP_DELAY_MS = 4500;

interface MapTopChromeProps {
  alertsCount: number;
  isLive?: boolean;
  onOpenAlerts: () => void;
}

function shouldShowTip(): boolean {
  try {
    const raw = localStorage.getItem(TIP_STORAGE_KEY);
    if (!raw) return true;
    const seen = Number(raw);
    if (!Number.isFinite(seen)) return true;
    return Date.now() - seen > TIP_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return true;
  }
}

function markTipSeen(): void {
  try {
    localStorage.setItem(TIP_STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export default function MapTopChrome({
  alertsCount,
  isLive = true,
  onOpenAlerts,
}: MapTopChromeProps) {
  const [tipOpen, setTipOpen] = useState(false);

  useEffect(() => {
    if (!shouldShowTip()) return;
    const id = window.setTimeout(() => setTipOpen(true), TIP_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const dismissTip = () => {
    markTipSeen();
    setTipOpen(false);
  };

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

        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={KOFI_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismissTip}
            className="kofi-chip inline-flex items-center gap-1.5 h-9 pl-2.5 pr-3 rounded-full bg-[#FF5E5B] text-white border border-[#ff7a78] shadow-[0_4px_14px_rgba(255,94,91,0.45)] active:scale-95 transition-transform"
            title="Offri un caffè"
            aria-label="Offri un caffè su Ko-fi"
          >
            <Coffee className="w-3.5 h-3.5" />
            <span className="text-[11px] font-black leading-none tracking-tight">
              Offri un caffè
            </span>
          </a>
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
      </div>

      {tipOpen && (
        <div className="pointer-events-auto mx-3 mt-2 flex justify-end">
          <div
            role="status"
            className="kofi-tip relative max-w-[min(92vw,280px)] rounded-2xl bg-[#FF5E5B] text-white px-3.5 py-3 shadow-[0_12px_32px_rgba(255,94,91,0.4)] border border-white/25"
          >
            <div
              className="absolute -top-1.5 right-10 w-3 h-3 rotate-45 bg-[#FF5E5B] border-l border-t border-white/25"
              aria-hidden
            />
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black leading-snug">
                  Ti è utile GTT Live?
                </p>
                <p className="text-[11px] font-medium leading-snug text-white/90 mt-0.5">
                  Un caffè aiuta a tenerla online, senza pubblicità.
                </p>
                <a
                  href={KOFI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={dismissTip}
                  className="mt-2 inline-flex items-center justify-center rounded-xl bg-white text-[#c2410c] text-[11px] font-black px-3 py-1.5 active:scale-95"
                >
                  Apri Ko-fi
                </a>
              </div>
              <button
                type="button"
                onClick={dismissTip}
                className="shrink-0 p-1 rounded-full hover:bg-white/15 active:scale-90"
                aria-label="Chiudi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
