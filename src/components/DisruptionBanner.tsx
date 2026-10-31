"use client";

import { AlertTriangle } from "lucide-react";

export default function DisruptionBanner({
  text,
  tone,
  onOpen,
}: {
  text: string;
  tone: "red" | "amber";
  onOpen: () => void;
}) {
  const red = tone === "red";
  return (
    <div className="mx-3 mt-2 pointer-events-none">
      <button
        type="button"
        onClick={onOpen}
        className={`pointer-events-auto w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-left shadow-lg border ${
          red
            ? "bg-rose-600 text-white border-rose-700"
            : "bg-amber-400 text-amber-950 border-amber-500"
        }`}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="text-[12px] font-black leading-tight flex-1 truncate">{text}</span>
        <span className="text-[10px] font-bold opacity-70 shrink-0">Apri</span>
      </button>
    </div>
  );
}
