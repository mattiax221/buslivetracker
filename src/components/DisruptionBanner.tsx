"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { DisruptionSlide } from "../lib/disruptions";

const HOLD_MS = 5000;

export default function DisruptionBanner({
  slides,
  onOpen,
}: {
  slides: DisruptionSlide[];
  onOpen: () => void;
}) {
  const signature = slides.map((slide) => slide.text).join("\n");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [signature]);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [signature, slides.length]);

  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  const red = slide.tone === "red";

  return (
    <div className="mx-3 mt-2 pointer-events-none">
      <button
        type="button"
        onClick={onOpen}
        className={`pointer-events-auto w-full flex items-center gap-2 rounded-2xl px-3 py-2 text-left shadow-lg border transition-colors duration-300 ${
          red
            ? "bg-rose-600 text-white border-rose-700"
            : "bg-amber-400 text-amber-950 border-amber-500"
        }`}
      >
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="relative flex-1 min-w-0 h-[1.15em] overflow-hidden">
          <span key={`${index}:${slide.text}`} className="disruption-drop block truncate text-[12px] font-black leading-tight">
            {slide.text}
          </span>
        </span>
        <span className="text-[10px] font-bold opacity-70 shrink-0">Apri</span>
      </button>
    </div>
  );
}
