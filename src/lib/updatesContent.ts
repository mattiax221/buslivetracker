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
    title: "Widget / scorciatoia “casa ↔ lavoro”",
    detail: "Due fermate o linee fisse apribili in un tap dalla Home.",
  },
  {
    status: "soon",
    title: "Storico linee usate di recente",
    detail: "Oltre ai preferiti, le ultime linee/fermate aperte senza salvarle.",
  },
  {
    status: "exploring",
    title: "Meno sovrapposizione badge a zoom basso",
    detail: "Raggruppamento o priorità dei mezzi quando la mappa è piena.",
  },
  {
    status: "exploring",
    title: "Modalità offline base",
    detail: "Fermate e linee consultabili anche senza rete (senza live GPS).",
  },
  {
    status: "exploring",
    title: "Condivisione fermata con countdown",
    detail: "Link o messaggio con i prossimi arrivi già formattati.",
  },
];
