"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, LocateFixed, Loader2, ShieldCheck, X } from "lucide-react";
import {
  clearPermissionsDismissed,
  getPermissionSnapshot,
  markPermissionsDismissed,
  requestLocationAccess,
  shouldShowPermissionsPrompt,
  ensurePushIfGranted,
  type PermissionSnapshot,
} from "../lib/appPermissions";
import { subscribeDevicePush } from "../lib/pushClient";
import { registerServiceWorker } from "../lib/pwa";

const RECHECK_MS = 30 * 60 * 1000; // ogni 30 min mentre l'app è aperta

export default function PermissionsPrompt() {
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<PermissionSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const recheck = useCallback(async () => {
    await registerServiceWorker();
    const next = await getPermissionSnapshot();
    setSnap(next);

    if (!next.needsAttention) {
      setOpen(false);
      await ensurePushIfGranted();
      return;
    }

    // Se già granted notifiche ma manca subscription, ritenta in silenzio
    if (next.notifications === "granted") {
      await ensurePushIfGranted();
    }

    if (shouldShowPermissionsPrompt(next)) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void recheck();
    }, 600);

    const onVis = () => {
      if (document.visibilityState === "visible") void recheck();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void recheck();
    }, RECHECK_MS);

    return () => {
      window.clearTimeout(boot);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [recheck]);

  const dismiss = () => {
    markPermissionsDismissed();
    setOpen(false);
    setMsg(null);
  };

  const activate = async () => {
    setBusy(true);
    setMsg(null);
    clearPermissionsDismissed();

    const geoOk = await requestLocationAccess();
    const push = await subscribeDevicePush();

    const after = await getPermissionSnapshot();
    setSnap(after);

    if (geoOk && push.ok) {
      setMsg("Tutto attivo. Puoi chiudere.");
      window.setTimeout(() => {
        setOpen(false);
        setMsg(null);
      }, 900);
    } else if (!after.needsAttention) {
      setOpen(false);
    } else {
      const parts: string[] = [];
      if (!geoOk || after.geo === "denied") {
        parts.push(
          after.geo === "denied"
            ? "Posizione bloccata: abilitala nelle impostazioni del browser/telefono."
            : "Posizione non concessa."
        );
      }
      if (!push.ok) {
        parts.push(
          after.notifications === "denied"
            ? "Notifiche bloccate: abilitalo dalle impostazioni del sito."
            : push.error || "Notifiche non attivate."
        );
      }
      setMsg(parts.join(" "));
      markPermissionsDismissed();
    }
    setBusy(false);
  };

  if (!open || !snap) return null;

  const geoLabel =
    snap.geo === "granted"
      ? "Attiva"
      : snap.geo === "denied"
        ? "Bloccata"
        : "Da autorizzare";
  const notifLabel =
    snap.notifications === "granted"
      ? "Attive"
      : snap.notifications === "denied"
        ? "Bloccate"
        : "Da autorizzare";

  return (
    <div className="fixed inset-0 z-[5000] flex items-end sm:items-center justify-center p-3 bg-slate-950/45 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="perms-title"
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden chrome-enter"
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl overflow-hidden bg-[#0B5FFF] shrink-0 shadow-md shadow-blue-500/25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h2
                id="perms-title"
                className="font-black text-slate-900 tracking-tight text-lg leading-tight"
              >
                Autorizza GTT Live
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Serve per la mappa e gli avvisi anche a schermo spento.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 space-y-2.5">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3">
            <LocateFixed className="w-5 h-5 text-[#0B5FFF] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Posizione</p>
              <p className="text-[11px] text-slate-500">
                Per centrarti e trovare le fermate vicine. Resta sul telefono.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">
              {geoLabel}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 border border-slate-100 px-3.5 py-3">
            <Bell className="w-5 h-5 text-[#0B5FFF] shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900">Notifiche</p>
              <p className="text-[11px] text-slate-500">
                Il dispositivo si iscrive a GTT Live (non a una newsletter).
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 shrink-0">
              {notifLabel}
            </span>
          </div>
        </div>

        {msg && (
          <p className="mx-5 mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            {msg}
          </p>
        )}

        <div className="p-5 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void activate()}
            className="w-full py-3 rounded-2xl bg-[#0B5FFF] text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Autorizza posizione e notifiche
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-2.5 rounded-2xl text-slate-500 text-xs font-semibold"
          >
            Più tardi
          </button>
        </div>
      </div>
    </div>
  );
}
