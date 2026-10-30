"use client";

import { ReactNode, useEffect } from "react";
import { ActiveSheet } from "../lib/mapUtils";

interface SheetHostProps {
  active: ActiveSheet;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Exclusive sheet host: one sheet at a time, single backdrop.
 * Child sheets should render content only (no own backdrop) when used here;
 * for legacy sheets that still include a backdrop, exclusivity alone prevents stacking.
 */
export default function SheetHost({ active, onClose, children }: SheetHostProps) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const scrollY = window.scrollY;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    // iOS: keep visual viewport from shifting under the sheet
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col justify-end overscroll-none">
      <button
        type="button"
        aria-label="Chiudi"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 pointer-events-none flex flex-col justify-end min-h-0 max-h-[min(92dvh,100%)] w-full">
        <div className="pointer-events-auto min-h-0 max-h-full overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
