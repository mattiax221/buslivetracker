export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  items: string[];
};

export type RoadmapItem = {
  status: "soon" | "exploring";
  title: string;
  detail: string;
};

export const CHANGELOG: ChangelogEntry[] = [
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
    status: "soon",
    title: "Avvisi smart su linea / fermata",
    detail:
      "Notifica quando il tuo bus preferito è in arrivo, riusando le push già attive.",
  },
  {
    status: "soon",
    title: "GPS utente più stabile",
    detail:
      "Meno jitter da fermo e centratura più naturale mentre cammini.",
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
];
