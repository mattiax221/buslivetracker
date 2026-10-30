"use client";

import { X, Shield, MapPinned, Database, ExternalLink } from "lucide-react";

interface AboutPrivacySheetProps {
  isOpen: boolean;
  onClose: () => void;
  hosted?: boolean;
}

export default function AboutPrivacySheet({
  isOpen,
  onClose,
  hosted = false,
}: AboutPrivacySheetProps) {
  if (!isOpen) return null;

  const panel = (
    <div className="bg-white rounded-t-3xl shadow-2xl max-h-[min(85dvh,100%)] flex flex-col overflow-hidden pb-safe animate-in slide-in-from-bottom duration-200">
      <div className="w-full flex justify-center pt-2.5 pb-1" onClick={onClose}>
        <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
      </div>

      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0B5FFF] text-white flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight">
              Info & Privacy
            </h2>
            <p className="text-[11px] text-slate-500">GTT Live · open source</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full active:bg-slate-100 text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-4 space-y-4 text-sm text-slate-700">
        <section className="space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
            <MapPinned className="w-3.5 h-3.5 text-[#0B5FFF]" />
            Posizione
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            La tua posizione GPS resta sul dispositivo e serve solo a mostrarti
            sulla mappa e la fermata più vicina. Non creiamo account e non
            inviamo la posizione a server di terze parti per profilazione o
            pubblicità.
          </p>
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-xs uppercase tracking-wider">
            <Database className="w-3.5 h-3.5 text-[#0B5FFF]" />
            Dati mezzi
          </div>
          <ul className="text-xs leading-relaxed text-slate-600 space-y-1 list-disc pl-4">
            <li>
              <span className="font-semibold text-slate-800">Bus e tram:</span>{" "}
              posizioni dal feed ufficiale GTFS-RT GTT quando disponibili.
            </li>
            <li>
              <span className="font-semibold text-slate-800">⏱ Stimato:</span>{" "}
              posizione calcolata da orari/tracciato se manca il GPS.
            </li>
            <li>
              <span className="font-semibold text-slate-800">Metro M1:</span>{" "}
              posizione <em>simulata</em> da modello orari (niente GPS in
              galleria). Non è telemetria ATC ufficiale.
            </li>
            <li>
              <span className="font-semibold text-slate-800">Ascensori M1:</span>{" "}
              dati di riferimento statici, non aggiornati in tempo reale.
            </li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Crediti
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Dati trasporto: GTT / open data. Cartografia: Esri World Street Map.
            Fermate e percorsi da dataset pubblici. Progetto indipendente, non
            affiliato a GTT.
          </p>
        </section>

        <a
          href="https://github.com/mattiax221/buslivetracker"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full p-3 rounded-2xl bg-slate-900 text-white text-xs font-bold active:scale-[0.99] transition-transform"
        >
          <span>Codice su GitHub</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
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
