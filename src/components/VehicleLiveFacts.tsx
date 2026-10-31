"use client";

import { useEffect, useState } from "react";
import { Accessibility, Clock } from "lucide-react";

type Tone = "late" | "early" | "ontime";

function formatDelay(delaySec: number): { label: string; short: string; tone: Tone } {
  if (Math.abs(delaySec) < 45) {
    return { label: "In orario", short: "In orario", tone: "ontime" };
  }
  const min = Math.max(1, Math.round(Math.abs(delaySec) / 60));
  const unit = min === 1 ? "minuto" : "minuti";
  if (delaySec > 0) {
    return {
      label: `In ritardo di ${min} ${unit}`,
      short: `Ritardo ${min} min`,
      tone: "late",
    };
  }
  return {
    label: `In anticipo di ${min} ${unit}`,
    short: `Anticipo ${min} min`,
    tone: "early",
  };
}

function formatFixAge(fixAtSec: number, nowMs: number): { label: string; short: string; stale: boolean } {
  const sec = Math.max(0, Math.round(nowMs / 1000 - fixAtSec));
  if (sec < 15) {
    return { label: "Posizione aggiornata ora", short: "GPS ora", stale: false };
  }
  if (sec < 60) {
    return {
      label: `Posizione di ${sec} s fa`,
      short: `GPS ${sec} s fa`,
      stale: false,
    };
  }
  const min = Math.round(sec / 60);
  const stale = sec >= 120;
  if (min < 60) {
    return {
      label: `Posizione di ${min} min fa`,
      short: `GPS ${min} min fa`,
      stale,
    };
  }
  return { label: "Posizione di oltre un’ora fa", short: "GPS vecchio", stale: true };
}

const LIGHT: Record<Tone, string> = {
  late: "bg-rose-50 text-rose-800 border-rose-200",
  early: "bg-sky-50 text-sky-800 border-sky-200",
  ontime: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

const DARK: Record<Tone, string> = {
  late: "bg-rose-500/20 text-rose-200",
  early: "bg-sky-500/20 text-sky-200",
  ontime: "bg-emerald-500/20 text-emerald-200",
};

export default function VehicleLiveFacts({
  delaySec,
  fixAt,
  wheelchair,
  variant,
}: {
  delaySec?: number;
  fixAt?: number;
  wheelchair?: "yes" | "no";
  variant: "light" | "dark";
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const delay =
    delaySec != null && Number.isFinite(delaySec) ? formatDelay(delaySec) : null;
  const age = fixAt != null && fixAt > 0 ? formatFixAge(fixAt, now) : null;
  const chair =
    wheelchair === "yes"
      ? "Accessibile in carrozzina"
      : wheelchair === "no"
        ? "Non accessibile in carrozzina"
        : null;

  if (!delay && !age && !chair) return null;

  if (variant === "dark") {
    return (
      <div className="flex flex-wrap gap-1">
        {delay && (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${DARK[delay.tone]}`}>
            {delay.short}
          </span>
        )}
        {age && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              age.stale ? "bg-amber-500/25 text-amber-200" : "bg-white/10 text-slate-200"
            }`}
          >
            {age.short}
          </span>
        )}
        {chair && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-slate-100">
            {wheelchair === "yes" ? "Carrozzina" : "Non accessibile"}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-1">
      {delay && (
        <div className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${LIGHT[delay.tone]}`}>
          {delay.label}
        </div>
      )}
      {age && (
        <div
          className={`text-[11px] font-medium px-2 py-1 rounded-lg border flex items-center gap-1 ${
            age.stale
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-slate-50 text-slate-600 border-slate-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {age.label}
        </div>
      )}
      {chair && (
        <div className="text-[11px] font-medium px-2 py-1 rounded-lg border bg-slate-50 text-slate-700 border-slate-200 flex items-center gap-1">
          <Accessibility className="w-3.5 h-3.5 shrink-0" />
          {chair}
        </div>
      )}
    </div>
  );
}

/** Compact mark for the map badge. Empty when the run is on time or unknown. */
export function delayMark(delaySec?: number): string {
  if (delaySec == null || !Number.isFinite(delaySec) || Math.abs(delaySec) < 45) return "";
  const min = Math.max(1, Math.round(Math.abs(delaySec) / 60));
  return delaySec > 0 ? `+${min}` : `\u2212${min}`;
}
