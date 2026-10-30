"use client";

import { ReactNode } from "react";
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
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Chiudi"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 pointer-events-none flex flex-col justify-end min-h-0 max-h-full">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
}
