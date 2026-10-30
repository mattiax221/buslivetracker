"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellRing,
  Bug,
  Lightbulb,
  Loader2,
  Map,
  MessageSquarePlus,
  Rocket,
  Send,
  Sparkles,
} from "lucide-react";
import { CHANGELOG, ROADMAP } from "../lib/updatesContent";
import { registerServiceWorker } from "../lib/pwa";
import { subscribeDevicePush } from "../lib/pushClient";
import type { Suggestion, SuggestionCategory } from "../lib/suggestions";
import {
  isSmartAlertsEnabled,
  setSmartAlertsEnabled,
  syncSmartAlertPrefs,
} from "../lib/smartAlerts";

export default function UpdatesPageClient() {
  const [tab, setTab] = useState<"log" | "next" | "ideas" | "push">("log");

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [persisted, setPersisted] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<SuggestionCategory>("idea");
  const [sending, setSending] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const [pushReady, setPushReady] = useState(false);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [smartOn, setSmartOn] = useState(false);

  useEffect(() => {
    setSmartOn(isSmartAlertsEnabled());
  }, []);

  const loadSuggestions = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/suggestions");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setPersisted(!!data.persisted);
    } catch {
      setFormMsg("Impossibile caricare i suggerimenti.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
    registerServiceWorker();
    fetch("/api/push/status")
      .then((r) => r.json())
      .then((d) => {
        setPushReady(!!d.pushConfigured);
        setVapidKey(d.vapidPublicKey);
      })
      .catch(() => setPushReady(false));
  }, [loadSuggestions]);

  const submitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setFormMsg(null);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormMsg(data.error || "Invio non riuscito.");
        return;
      }
      setText("");
      setFormMsg("Grazie! Il suggerimento è in bacheca.");
      if (data.suggestion) {
        setSuggestions((prev) => [data.suggestion, ...prev]);
      } else {
        await loadSuggestions();
      }
      if (data.persisted === false) {
        setPersisted(false);
      }
    } catch {
      setFormMsg("Errore di rete.");
    } finally {
      setSending(false);
    }
  };

  const enablePush = async () => {
    setPushBusy(true);
    setPushStatus(null);
    try {
      const result = await subscribeDevicePush(vapidKey);
      if (!result.ok) {
        setPushStatus(result.error || "Attivazione non riuscita.");
        return;
      }
      setEndpoint(result.endpoint || null);
      setPushStatus(
        "Dispositivo registrato. Puoi provare una notifica anche a schermo spento."
      );
    } catch (err) {
      setPushStatus(
        err instanceof Error ? err.message : "Attivazione non riuscita."
      );
    } finally {
      setPushBusy(false);
    }
  };

  const sendTestPush = async () => {
    setPushBusy(true);
    setPushStatus(null);
    try {
      let ep = endpoint;
      if (!ep) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        ep = sub?.endpoint || null;
        setEndpoint(ep);
      }
      if (!ep) {
        setPushStatus("Attiva prima le notifiche.");
        return;
      }
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: ep }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPushStatus(data.error || "Invio prova fallito.");
        return;
      }
      setPushStatus("Notifica di prova inviata. Controlla il telefono.");
    } catch (err) {
      setPushStatus(err instanceof Error ? err.message : "Errore invio.");
    } finally {
      setPushBusy(false);
    }
  };

  const catIcon = (c: SuggestionCategory) => {
    if (c === "bug") return <Bug className="w-3.5 h-3.5 text-rose-600" />;
    if (c === "altro") return <MessageSquarePlus className="w-3.5 h-3.5 text-slate-500" />;
    return <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
  };

  return (
    <div className="min-h-dvh bg-[#F0F4F8] text-slate-900 overflow-y-auto overscroll-y-contain">
      <header className="sticky top-0 z-20 pt-safe bg-white/90 backdrop-blur-xl border-b border-slate-200/80">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center active:scale-95"
            aria-label="Torna alla mappa"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-black text-[17px] tracking-tight leading-none">
              Aggiornamenti
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Changelog · roadmap · suggerimenti · notifiche
            </p>
          </div>
          <Link
            href="/"
            className="text-[11px] font-bold text-[#0B5FFF] flex items-center gap-1"
          >
            <Map className="w-3.5 h-3.5" />
            Mappa
          </Link>
        </div>

        <div className="max-w-lg mx-auto px-3 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              ["log", "Novità"],
              ["next", "Prossimi"],
              ["ideas", "Suggerimenti"],
              ["push", "Notifiche"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                tab === id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 pb-safe space-y-4">
        {tab === "log" && (
          <section className="space-y-3">
            {CHANGELOG.map((entry) => (
              <article
                key={entry.version}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#0B5FFF]">
                      v{entry.version} · {entry.date}
                    </div>
                    <h2 className="font-black text-sm mt-0.5">{entry.title}</h2>
                  </div>
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
                <ul className="space-y-1.5">
                  {entry.items.map((item) => (
                    <li
                      key={item}
                      className="text-xs text-slate-600 leading-relaxed flex gap-2"
                    >
                      <span className="text-[#0B5FFF] font-black">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>
        )}

        {tab === "next" && (
          <section className="space-y-3">
            {ROADMAP.map((item) => (
              <article
                key={item.title}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Rocket className="w-4 h-4 text-[#0B5FFF]" />
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      item.status === "done"
                        ? "bg-blue-50 text-[#0B5FFF]"
                        : item.status === "soon"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.status === "done"
                      ? "Fatto"
                      : item.status === "soon"
                        ? "In arrivo"
                        : "In studio"}
                  </span>
                </div>
                <h2 className="font-black text-sm">{item.title}</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {item.detail}
                </p>
              </article>
            ))}
          </section>
        )}

        {tab === "ideas" && (
          <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
              <div>
                <h2 className="font-black text-sm flex items-center gap-2">
                  <MessageSquarePlus className="w-4 h-4 text-[#0B5FFF]" />
                  Lascia un suggerimento
                </h2>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Anonimo, senza account. Tutti vedono la bacheca qui in app —
                  anche lo sviluppatore.
                </p>
              </div>

              {!persisted && (
                <p className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 rounded-xl px-3 py-2">
                  Storage cloud non configurato: i messaggi restano solo su
                  questo server (utile in locale). Su Vercel collega Upstash KV.
                </p>
              )}

              <form onSubmit={submitSuggestion} className="space-y-2.5">
                <div className="flex gap-1.5">
                  {(
                    [
                      ["idea", "Idea"],
                      ["bug", "Bug"],
                      ["altro", "Altro"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategory(id)}
                      className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border ${
                        category === id
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Es. vorrei filtri per linee notturne…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#0B5FFF] focus:bg-white resize-none"
                />
                <button
                  type="submit"
                  disabled={sending || text.trim().length < 8}
                  className="w-full py-2.5 rounded-xl bg-[#0B5FFF] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Pubblica in bacheca
                </button>
                {formMsg && (
                  <p className="text-[11px] text-slate-600 text-center">{formMsg}</p>
                )}
              </form>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Bacheca ({suggestions.length})
              </h3>
              {loadingList ? (
                <div className="flex justify-center py-8 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : suggestions.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6 bg-white rounded-2xl border border-dashed border-slate-200">
                  Ancora nessun suggerimento. Sii il primo.
                </p>
              ) : (
                suggestions.map((s) => (
                  <article
                    key={s.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-sm"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {catIcon(s.category)}
                      <span>{s.category}</span>
                      <span className="text-slate-300">·</span>
                      <time dateTime={s.createdAt}>
                        {new Date(s.createdAt).toLocaleString("it-IT", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">
                      {s.text}
                    </p>
                  </article>
                ))
              )}
            </div>
          </section>
        )}

        {tab === "push" && (
          <section className="space-y-3">
            <article className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#0B5FFF] text-white flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-black text-sm">Notifiche sul telefono</h2>
                  <p className="text-[11px] text-slate-500">
                    Come WhatsApp, via Web Push
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tocca <strong>Attiva notifiche</strong>: il telefono si{" "}
                <em>iscrive a GTT Live</em>. Su iPhone serve l’app in Home (PWA).
              </p>
              <p className="text-[11px] bg-slate-50 text-slate-600 border border-slate-200 rounded-xl px-3 py-2 leading-relaxed">
                <strong>Perché a app chiusa non partiva:</strong> su Vercel Hobby
                non si può programmare un cron ogni 5 minuti (solo 1/giorno). Gli
                avvisi locali funzionano con l’app aperta. Per la push a app
                chiusa: attiva gli avvisi preferiti qui sotto, poi in GitHub →
                Settings → Secrets aggiungi{" "}
                <code className="font-mono text-[10px]">CRON_URL</code> (URL
                completo di{" "}
                <code className="font-mono text-[10px]">
                  /api/cron/smart-alerts
                </code>
                ) e{" "}
                <code className="font-mono text-[10px]">CRON_SECRET</code>{" "}
                (uguale a Vercel). Il workflow ogni 5 min manda gli avvisi.
              </p>

              {!pushReady && (
                <p className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 rounded-xl px-3 py-2">
                  Server senza chiavi VAPID. Genera con{" "}
                  <code className="font-mono">npm run vapid</code> e aggiungi le
                  env su Vercel.
                </p>
              )}

              <button
                type="button"
                disabled={pushBusy || !pushReady}
                onClick={enablePush}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                {pushBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4" />
                )}
                Attiva notifiche
              </button>
              <button
                type="button"
                disabled={pushBusy || !pushReady}
                onClick={sendTestPush}
                className="w-full py-2.5 rounded-xl bg-[#0B5FFF] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
              >
                Invia notifica di prova
              </button>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">
                    Avvisi sui preferiti
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Fermata: mezzo entro 4 min. Linea: GPS entro ~450 m da te.
                    Serve “Attiva notifiche” + preferiti salvati.
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={smartOn}
                  onClick={() => {
                    const next = !smartOn;
                    setSmartOn(next);
                    setSmartAlertsEnabled(next);
                    try {
                      const lines = JSON.parse(
                        localStorage.getItem("gtt_fav_lines") || "[]"
                      ) as string[];
                      const stops = JSON.parse(
                        localStorage.getItem("gtt_fav_stops") || "[]"
                      ) as { code: string; name: string }[];
                      void syncSmartAlertPrefs({
                        enabled: next,
                        lines: Array.isArray(lines) ? lines : [],
                        stops: Array.isArray(stops) ? stops : [],
                      });
                    } catch {
                      void syncSmartAlertPrefs({
                        enabled: next,
                        lines: [],
                        stops: [],
                      });
                    }
                    setPushStatus(
                      next
                        ? "Avvisi attivi: ~50s con app aperta; a app chiusa serve il cron GitHub (vedi nota sopra)."
                        : "Avvisi preferiti disattivati."
                    );
                  }}
                  className={`w-11 h-6 rounded-full p-0.5 shrink-0 transition-colors ${
                    smartOn ? "bg-[#0B5FFF]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      smartOn ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {pushStatus && (
                <p className="text-[11px] text-slate-600 text-center leading-relaxed">
                  {pushStatus}
                </p>
              )}
            </article>
          </section>
        )}
      </main>
    </div>
  );
}
