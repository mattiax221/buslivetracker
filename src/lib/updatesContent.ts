export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

export type RoadmapItem = {
  status: "soon" | "exploring" | "done";
  title: string;
  detail: string;
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.3.17",
    date: "2026-10-31",
    title: "Foto E-Way e tram serie 8000",
    items: [
      "Matricola 8001–8070: tram Hitachi serie 8000, con foto di un mezzo GTT",
      "Matricola 9400–9535: Iveco E-Way 12 m. La foto è del modello: non esiste ancora una foto libera di un E-Way GTT",
    ],
  },
  {
    version: "0.3.16",
    date: "2026-10-31",
    title: "Matricola e modello del mezzo",
    items: [
      "Nel popup del mezzo: matricola GTT e serie (es. 6038 → Alstom Cityway)",
    ],
  },
  {
    version: "0.3.15",
    date: "2026-10-30",
    title: "Night mode e push a app chiusa",
    items: [
      "Modalità notte (Altro → Modalità notte), mappa scura e chrome adattati",
      "Cron GitHub Actions ogni 5 min per avvisi preferiti anche a app chiusa (Hobby Vercel non può)",
    ],
  },
  {
    version: "0.3.14",
    date: "2026-10-30",
    title: "GPS mezzi più reattivo",
    items: [
      "Poll posizioni ogni 3s con app aperta (15s in background)",
      "Calibrazione pallini: filtra jitter da fermo e scorrimento fluido tra un GPS e il successivo",
    ],
  },
  {
    version: "0.3.13",
    date: "2026-10-30",
    title: "Indicazioni percorso sulla mappa",
    items: [
      "Ricerca anche vie, corsi e indirizzi (oltre alle fermate)",
      "Avvia indicazioni: tragitto in mappa e solo i mezzi delle linee del percorso",
      "Tasto Percorso in evidenza nella barra in basso",
    ],
  },
  {
    version: "0.3.12",
    date: "2026-10-30",
    title: "Calcola percorso e scorciatoie",
    items: [
      "Partenza → arrivo + orario: percorsi più veloci bus/tram (Muoversi a Torino)",
      "Salva il tragitto come scorciatoia (es. casa → lavoro) e riaprilo da Preferiti",
      "Fix barra sotto che usciva dallo schermo con i popup",
    ],
  },
  {
    version: "0.3.11",
    date: "2026-10-30",
    title: "Avvisi preferiti e ultime usate",
    items: [
      "Notifiche smart su fermate/linee preferite (leggere, con cooldown)",
      "Ultime linee e fermate aperte in Preferiti",
    ],
  },
  {
    version: "0.3.10",
    date: "2026-10-30",
    title: "Fix loop GPS che faceva impazzire Chrome",
    items: [
      "Il watcher GPS non si riavviava più a ogni render (loop infinito)",
      "Scan fermate più vicine limitato e senza setState inutili",
    ],
  },
  {
    version: "0.3.9",
    date: "2026-10-30",
    title: "Fix crash / kick fuori dall’app",
    items: [
      "Service worker non cachea più JSON enormi (causa OOM Android)",
      "A zoom largo i GPS restano tutti, ma come punti leggeri",
      "line-shapes da 3MB solo se serve (linea o stime)",
    ],
  },
  {
    version: "0.3.8",
    date: "2026-10-30",
    title: "Tutti i mezzi GPS, stime opzionali",
    items: [
      "Niente più limite sul numero di pullman con GPS in mappa",
      "Mezzi programmati (senza GPS) spenti di default, attivabili dalla legenda",
    ],
  },
  {
    version: "0.3.7",
    date: "2026-10-30",
    title: "Meno freeze + aggiorna mezzi",
    items: [
      "Tasto Aggiorna nella barra in basso",
      "Stime da orario spente di default (pesanti)",
      "Poll più leggero e debounce sullo spostamento mappa",
    ],
  },
  {
    version: "0.3.6",
    date: "2026-10-30",
    title: "Mappa libera di nuovo",
    items: [
      "Tolto il blocco / clamp che faceva scattare lo zoom",
      "Mappa libera; restano i limiti sui marker per non crashare",
    ],
  },
  {
    version: "0.3.5",
    date: "2026-10-30",
    title: "Niente animazione continua dei mezzi",
    items: [
      "I pullman si aggiornano col feed, senza scorrimento a ogni frame",
    ],
  },
  {
    version: "0.3.4",
    date: "2026-10-30",
    title: "Mappa solo Torino, niente crash a zoom basso",
    items: [
      "Non si esce più dall’area urbana di Torino",
      "A zoom largo pochi mezzi vicini, non tutta la flotta",
    ],
  },
  {
    version: "0.3.3",
    date: "2026-10-30",
    title: "Meno lag e pagina Aggiornamenti scorrevole",
    items: [
      "Animazione mezzi più leggera sul telefono",
      "Aggiornamenti si scrolla di nuovo",
    ],
  },
  {
    version: "0.3.2",
    date: "2026-10-30",
    title: "GPS più veloce e Preferiti utili",
    items: [
      "Apertura sulla tua ultima posizione (senza aspettare il GPS)",
      "Preferiti: arrivi live, distanza, mezzi in diretta, azioni rapide",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-10-30",
    title: "Permessi all’apertura e nuovo logo",
    items: [
      "All’apertura chiede posizione e notifiche (con riproposta se le disattivi)",
      "Nuovo logo / icone Home Screen",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-10-30",
    title: "App pubblica, motion e aggiornamenti",
    items: [
      "Redesign mobile: chrome top/bottom, un solo sheet alla volta",
      "Movimento fluido dei mezzi: in moto scorre, da fermo resta fermo",
      "Rimossi percorso rotto, AI, sveglie e multi-stili mappa",
      "Etichette oneste: metro simulata, stime da orari, ascensori statici",
      "Info & Privacy in app, attribution mappa, errori feed visibili",
      "Pagina Aggiornamenti con changelog, roadmap e suggerimenti",
      "MVP notifiche push (iscrizione dispositivo + prova)",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-03",
    title: "Tracker live Torino",
    items: [
      "Mappa live bus/tram da GTFS-RT GTT",
      "Fermate e arrivi, avvisi servizio, preferiti locali",
      "PWA installabile",
    ],
  },
];

export const ROADMAP: RoadmapItem[] = [
  {
    status: "done",
    title: "GPS all’apertura più rapido",
    detail: "Cache ultima posizione + fix coarse subito, poi precisione alta.",
  },
  {
    status: "done",
    title: "Preferiti con contesto live",
    detail: "Arrivi, distanza e conteggio mezzi sulle linee salvate.",
  },
  {
    status: "done",
    title: "Avvisi smart su linea / fermata",
    detail:
      "Notifica sui preferiti: fermata ≤4 min, linea GPS vicino a te. Toggle in Aggiornamenti → Notifiche.",
  },
  {
    status: "done",
    title: "Ultime usate",
    detail: "Linee e fermate aperte di recente in Preferiti (solo localStorage leggero).",
  },
  {
    status: "done",
    title: "Percorso + scorciatoia casa↔lavoro",
    detail:
      "Calcola i percorsi più veloci con orario, poi salva partenza/arrivo come scorciatoia.",
  },
  {
    status: "soon",
    title: "Filtro solo i miei mezzi",
    detail: "Un interruttore per vedere in mappa solo le linee salvate.",
  },
  {
    status: "soon",
    title: "Orari della fermata anche senza live",
    detail: "Passaggi previsti da orario quando il GPS del mezzo manca.",
  },
  {
    status: "soon",
    title: "Condividi arrivo",
    detail: "Messaggio pronto con fermata e minuti al prossimo bus.",
  },
  {
    status: "exploring",
    title: "Meno lag con tanti bus",
    detail: "Meno marker a zoom basso e animazione più leggera sul telefono.",
  },
  {
    status: "done",
    title: "Modalità notte",
    detail: "Toggle in Altro; di default attiva la sera (19–7).",
  },
  {
    status: "exploring",
    title: "Accessibilità metro più chiara",
    detail: "Ascensori e barriere in evidenza quando apri una stazione M1.",
  },
  {
    status: "exploring",
    title: "Offline base",
    detail: "Fermate e linee consultabili senza rete (senza posizioni live).",
  },
];
