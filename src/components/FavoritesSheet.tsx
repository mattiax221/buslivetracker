"use client";

import { useState } from "react";
import {
  Star,
  Bell,
  Trash2,
  Plus,
  X,
  Volume2,
  Clock,
  Calendar,
  Check,
  MapPin,
  Bus,
} from "lucide-react";
import {
  CommuteAlarm,
  playTransitChime,
  triggerVibration,
  requestNotificationPermission,
  sendSystemNotification,
} from "../lib/alarmEngine";

const DAY_LABELS = [
  { val: 1, label: "L" },
  { val: 2, label: "M" },
  { val: 3, label: "M" },
  { val: 4, label: "G" },
  { val: 5, label: "V" },
  { val: 6, label: "S" },
  { val: 0, label: "D" },
];

interface FavoritesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  savedLines: string[];
  savedStops: { code: string; name: string }[];
  alarms: CommuteAlarm[];
  onToggleLineFavorite: (line: string) => void;
  onToggleStopFavorite: (stop: { code: string; name: string }) => void;
  onAddAlarm: (alarm: Omit<CommuteAlarm, "id">) => void;
  onToggleAlarm: (id: string) => void;
  onDeleteAlarm: (id: string) => void;
  onSelectLine: (line: string) => void;
  onSelectStop: (code: string) => void;
}

export default function FavoritesSheet({
  isOpen,
  onClose,
  savedLines,
  savedStops,
  alarms,
  onToggleLineFavorite,
  onToggleStopFavorite,
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onSelectLine,
  onSelectStop,
}: FavoritesSheetProps) {
  const [tab, setTab] = useState<"favorites" | "alarms">("favorites");
  const [isAddingAlarm, setIsAddingAlarm] = useState(false);

  // New alarm form state
  const [newAlarmLine, setNewAlarmLine] = useState("");
  const [newAlarmStop, setNewAlarmStop] = useState("");
  const [newAlarmStopName, setNewAlarmStopName] = useState("");
  const [newAlarmDays, setNewAlarmDays] = useState<number[]>([1, 2, 3, 4, 5]); // Lun-Ven
  const [newAlarmStart, setNewAlarmStart] = useState("07:30");
  const [newAlarmEnd, setNewAlarmEnd] = useState("08:45");
  const [newAlarmThreshold, setNewAlarmThreshold] = useState(3);

  if (!isOpen) return null;

  const handleTestAlarm = async () => {
    playTransitChime();
    triggerVibration();
    const granted = await requestNotificationPermission();
    if (granted) {
      sendSystemNotification(
        "🔔 Test Sveglia GTT",
        "Suono e vibrazione funzionano correttamente! Riceverai l'avviso quando il bus sarà vicino."
      );
    }
  };

  const handleSaveAlarm = () => {
    if (!newAlarmLine.trim() || !newAlarmStop.trim()) return;
    onAddAlarm({
      line: newAlarmLine.trim().toUpperCase(),
      stopCode: newAlarmStop.trim(),
      stopName: newAlarmStopName.trim() || `Fermata #${newAlarmStop.trim()}`,
      days: newAlarmDays,
      startTime: newAlarmStart,
      endTime: newAlarmEnd,
      thresholdMinutes: newAlarmThreshold,
      enabled: true,
    });
    setIsAddingAlarm(false);
    setNewAlarmLine("");
    setNewAlarmStop("");
    setNewAlarmStopName("");
  };

  const toggleDay = (day: number) => {
    setNewAlarmDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden pb-safe animate-in slide-in-from-bottom duration-200">
        {/* Handle */}
        <div className="w-full flex justify-center pt-2.5 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Star className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight leading-tight">
                I Tuoi Preferiti & Sveglie
              </h2>
              <p className="text-[11px] text-gray-500">
                Accesso rapido e avvisi intelligenti per pendolari
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500 active:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 p-1.5 mx-4 mt-2 rounded-xl text-xs font-bold">
          <button
            onClick={() => setTab("favorites")}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === "favorites"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Preferiti ({savedLines.length + savedStops.length})</span>
          </button>
          <button
            onClick={() => setTab("alarms")}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              tab === "alarms"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-blue-600" />
            <span>Sveglie Bus ({alarms.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto px-4 py-3 flex-1 space-y-4">
          {tab === "favorites" ? (
            <>
              {/* Favorite Lines */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Bus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Linee Preferite</span>
                </div>
                {savedLines.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl text-center">
                    Nessuna linea salvata. Clicca sulla stella vicino a una linea per aggiungerla qui!
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {savedLines.map((line) => (
                      <div
                        key={line}
                        className="flex items-center gap-2 bg-slate-900 text-white pl-3 pr-1.5 py-1.5 rounded-xl shadow-xs"
                      >
                        <button
                          onClick={() => {
                            onClose();
                            onSelectLine(line);
                          }}
                          className="font-black text-xs hover:text-blue-300"
                        >
                          Linea {line}
                        </button>
                        <button
                          onClick={() => onToggleLineFavorite(line)}
                          className="p-1 hover:text-red-400 transition-colors"
                          title="Rimuovi"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Favorite Stops */}
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fermate Preferite</span>
                </div>
                {savedStops.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-xl text-center">
                    Nessuna fermata salvata. Clicca sulla stella quando apri una fermata per aggiungerla!
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {savedStops.map((stop) => (
                      <div
                        key={stop.code}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all border border-gray-100"
                      >
                        <button
                          onClick={() => {
                            onClose();
                            onSelectStop(stop.code);
                          }}
                          className="text-left flex-1 min-w-0 pr-2"
                        >
                          <div className="font-bold text-xs text-gray-900 truncate">
                            {stop.name}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            Palina #{stop.code}
                          </div>
                        </button>
                        <button
                          onClick={() => onToggleStopFavorite(stop)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Rimuovi dai preferiti"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Alarms Tab */
            <div className="space-y-3">
              {/* Header with Test & Add */}
              <div className="flex items-center justify-between">
                <button
                  onClick={handleTestAlarm}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg active:scale-95 transition-all"
                  title="Prova il suono della campanella e la vibrazione"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Test Suono</span>
                </button>

                {!isAddingAlarm && (
                  <button
                    onClick={() => setIsAddingAlarm(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuova Sveglia</span>
                  </button>
                )}
              </div>

              {/* Add Alarm Form */}
              {isAddingAlarm && (
                <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3 animate-in fade-in duration-200">
                  <div className="font-bold text-xs text-blue-950 flex items-center justify-between">
                    <span>Imposta Notifica di Arrivo</span>
                    <button
                      onClick={() => setIsAddingAlarm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                        Linea (es. 4, 16CD, M1)
                      </label>
                      <input
                        type="text"
                        placeholder="Linea"
                        value={newAlarmLine}
                        onChange={(e) => setNewAlarmLine(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                        Codice Palina (es. 138)
                      </label>
                      <input
                        type="text"
                        placeholder="Codice fermata"
                        value={newAlarmStop}
                        onChange={(e) => setNewAlarmStop(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* Days Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-1">
                      Giorni attivi
                    </label>
                    <div className="flex gap-1">
                      {DAY_LABELS.map((d) => {
                        const active = newAlarmDays.includes(d.val);
                        return (
                          <button
                            key={d.val}
                            type="button"
                            onClick={() => toggleDay(d.val)}
                            className={`flex-1 py-1 rounded-lg text-xs font-black transition-all ${
                              active
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white text-gray-400 border border-gray-200"
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                        Fascia Dalle
                      </label>
                      <input
                        type="time"
                        value={newAlarmStart}
                        onChange={(e) => setNewAlarmStart(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                        Fascia Alle
                      </label>
                      <input
                        type="time"
                        value={newAlarmEnd}
                        onChange={(e) => setNewAlarmEnd(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                      />
                    </div>
                  </div>

                  {/* Preavviso */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 block mb-0.5">
                      Preavviso: Avvisami quando è a:
                    </label>
                    <div className="flex gap-2">
                      {[2, 3, 5, 8].map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() => setNewAlarmThreshold(min)}
                          className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${
                            newAlarmThreshold === min
                              ? "bg-slate-900 text-white"
                              : "bg-white text-gray-600 border border-gray-200"
                          }`}
                        >
                          {min} min
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAlarm}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Salva Sveglia</span>
                  </button>
                </div>
              )}

              {/* Alarms List */}
              {alarms.length === 0 && !isAddingAlarm ? (
                <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-400 space-y-1">
                  <Bell className="w-6 h-6 mx-auto text-gray-300 mb-1" />
                  <p className="font-bold text-gray-600">Nessuna sveglia attiva</p>
                  <p>
                    Imposta una sveglia con orari e giorni per ricevere una campanella quando il bus si avvicina!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className={`p-3 rounded-2xl border transition-all ${
                        alarm.enabled
                          ? "bg-white border-blue-200 shadow-xs"
                          : "bg-gray-50 border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-xs font-black">
                              Linea {alarm.line}
                            </span>
                            <span className="text-xs font-bold text-gray-800">
                              Palina #{alarm.stopCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {alarm.startTime} - {alarm.endTime}
                            </span>
                            <span>•</span>
                            <span>Preavviso {alarm.thresholdMinutes} min</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>
                              {alarm.days.length === 7
                                ? "Tutti i giorni"
                                : alarm.days.length === 5 && !alarm.days.includes(0) && !alarm.days.includes(6)
                                ? "Lun - Ven"
                                : `Giorni: ${alarm.days.map((d) => DAY_LABELS.find((l) => l.val === d)?.label).join(", ")}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onToggleAlarm(alarm.id)}
                            className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                              alarm.enabled ? "bg-blue-600" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                alarm.enabled ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => onDeleteAlarm(alarm.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Open Source Footer */}
          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>GTT Live Tracker • Open Source</span>
            <a
              href="https://github.com/mattiax221/buslivetracker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition-colors"
            >
              <span>GitHub</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

