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
    version: "0.3.5",
    date: "2026-10-30",
    title: "Niente animazione continua dei mezzi",
    items: [
      "I pullman si aggiornano col feed, senza scorrimento a ogni frame",
      "Mappa bloccata sull’area di Torino anche con il pinch",
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
    status: "soon",
    title: "Avvisi smart su linea / fermata",
    detail:
      "Notifica quando il tuo bus preferito è in arrivo, riusando le push già attive.",
  },
  {
    status: "soon",
    title: "Casa ↔ lavoro in un tap",
    detail: "Due fermate o linee fisse (mattina/sera) apribili dalla Home.",
  },
  {
    status: "soon",
    title: "Ultime usate",
    detail: "Le linee e fermate aperte di recente, senza doverle mettere nei preferiti.",
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
    status: "exploring",
    title: "Modalità notte",
    detail: "Mappa e chrome scuri per la sera, meno abbagliamento.",
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
