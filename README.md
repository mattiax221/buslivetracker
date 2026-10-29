# 🚌 GTT Live Tracker — Torino Transit Real-Time PWA

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-orange?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

Applicazione web progressiva (**PWA**) open-source, ultra-veloce e mobile-first per il tracciamento satellitare in tempo reale di **autobus, tram e metropolitana GTT a Torino**.

Sviluppata per offrire ai pendolari e ai cittadini torinesi un'esperienza superiore rispetto alle app tradizionali: zero pubblicità, zero POI commerciali invadenti, geolocalizzazione hardware ad alta precisione e navigazione rapida anche su smartphone economici.

---

## ✨ Funzionalità Principali

### 📡 1. Live Tracking GPS Satellitare (Bus & Tram)
- Monitoraggio in tempo reale di oltre **400 veicoli contemporaneamente** tramite il feed ufficiale GTT GTFS-RT.
- Frequenza di aggiornamento rapida (**ogni 5 secondi**) con pillola di sincronizzazione a larghezza fissa (zero jitter o scatti visivi).
- Culling dinamico della viewport per garantire **60 FPS stabili** e zero lag anche su dispositivi mobili con risorse limitate.

### 🚇 2. Motore Real-Time Metro M1 (VAL 208)
- Simulazione ad altissima precisione dei convogli automatici VAL 208 lungo le **23 stazioni** della linea M1 (da *Fermi* a *Bengasi*).
- 16-18 treni in ora di punta e 12 in morbida, con calcolo in tempo reale di velocità (~42-55 km/h), sosta in banchina (20s) e direzione.

### ⏱️ 3. Motore di Stima Posizione da Tabella Orari (Mezzi senza GPS)
- Per i mezzi e le corse sprovvisti di transponder GPS attivo, il sistema calcola la **posizione stimata in tempo reale** lungo il tracciato basandosi sulle tabelle orari e frequenze ufficiali GTT.
- **Deduplicazione Spaziale**: se un bus con GPS reale è già presente entro 1.300 metri, la stima evita doppioni.
- Distinzione visiva trasparente con badge tratteggiato ambra ed etichetta `⏱️ Posizione Stimata da Orari`.

### 🗺️ 4. Trip Planner Multi-Modale "Da A a B" (Google Maps Style)
- Inserisci punto di partenza (o usa **`[ 📍 La mia posizione attuale ]`** con un tap) e punto di arrivo (con mete frequenti: *Porta Nuova, Porta Susa, Politecnico, Molinette, Lingotto, ecc.*).
- Calcola itinerari multi-modale (**Piedi + Bus + Tram + Metro M1**), sia diretti che con cambio negli hub principali.
- **Integrazione Live**: segnala se il mezzo è in arrivo alla fermata di salita (`🟢 Mezzo in arrivo tra X min!`).
- Tracciamento visivo su mappa con tratte a piedi tratteggiate in blu e tratte sui mezzi con linea continua colorata ad alto contrasto.

### 🔔 5. Sveglia Pendolare & Notifiche Push in Background (PWA)
- Imposta sveglie personalizzate per le tue linee e fermate abituali (con fasce orarie e giorni della settimana Lun-Ven).
- Sintesi sonora a due toni (*transit chime*) via **Web Audio API** (senza file audio esterni pesanti) e vibrazione tattile.
- **Service Worker (`sw.js`)**: ricevi le notifiche push sul telefono anche con **schermo spento o browser chiuso**.

### 📲 6. Condivisione Rapida (WhatsApp, Telegram & Web Share)
- Condividi in 1 tap su **WhatsApp**, **Telegram** o appunti la posizione del bus, gli orari della fermata o l'itinerario calcolato, con testo precompilato e link diretto.

### ♿ 7. Accessibilità, Ascensori e Scale Mobili Metro M1
- Monitoraggio dello stato operativo di ascensori (Piano Strada ↔ Atrio, Atrio ↔ Banchina Fermi, Atrio ↔ Banchina Bengasi), scale mobili, percorsi tattili Loges e citofoni SOS per tutte le 23 stazioni.

### 🎨 8. Stili Mappa Multipli (Inclusa Dark AMOLED)
- Quattro stili mappa selezionabili con un tap:
  - **Esri Clean Street** (Mappa pulita ad alto contrasto senza bar/negozi)
  - **Minimal Light** (Mappa chiara sobria per risalto dei percorsi)
  - **Dark AMOLED** (Mappa notturna su asfalto scuro con linee neon ad alto impatto)
  - **OpenStreetMap** (Mappa classica topografica)

---

## 🛠️ Stack Tecnologico

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
- **Mappe**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icone**: [Lucide React](https://lucide.dev/)
- **Protocollo Dati**: [gtfs-realtime-bindings](https://www.npmjs.com/package/gtfs-realtime-bindings) (Protocol Buffers GTFS-RT)
- **Audio & Tattile**: Web Audio API & Vibration API
- **Offline & Push**: Service Worker PWA con Cache API

---

## 🚀 Come Eseguire in Locale

### Prerequisiti
- [Node.js](https://nodejs.org/) versione 18.18 o superiore
- npm, pnpm o yarn

### Installazione

1. Clona il repository:
   ```bash
   git clone https://github.com/mattiax221/buslivetracker.git
   cd buslivetracker
   ```

2. Installa le dipendenze:
   ```bash
   npm install
   ```

3. Avvia il server di sviluppo:
   ```bash
   npm run dev
   ```

4. Apri [http://localhost:3000](http://localhost:3000) nel browser (o dal telefono collegato alla stessa rete WiFi locale).

---

## ☁️ Deploy su Vercel (1-Click)

Il modo più rapido e gratuito per pubblicare online la PWA con certificato HTTPS e dominio personalizzato:

1. Vai su [Vercel](https://vercel.com/) ed effettua il login con il tuo account GitHub.
2. Clicca su **Add New...** -> **Project**.
3. Seleziona il repository **`buslivetracker`**.
4. Clicca su **Deploy**.
5. In circa 60 secondi il tuo tracker sarà pubblico online e installabile su qualsiasi smartphone Android e iOS!

---

## 📊 Fonti Dati & Ringraziamenti

- **GTT — Gruppo Torinese Trasporti**: Open Data GTFS & Feed Real-Time GTFS-RT (Posizione veicoli, avvisi e deviazioni).
- **Comune di Torino & Open Data Piemonte**: dataset fermate e percorsi di rete.
- **OpenStreetMap & Esri**: dati geografici e tile cartografici.
- **CARTO**: Dark Matter base maps.

---

## 📄 Licenza

Rilasciato sotto licenza [MIT](LICENSE). Libero per uso personale, didattico e contributi open-source.
