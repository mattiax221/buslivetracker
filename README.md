# GTT Live — Torino transit map (PWA)

Mobile-first Progressive Web App for **live GTT bus & tram positions** in Turin, plus stop arrivals, alerts, and favorites.

Open source · no ads · no accounts.  
Repo: [github.com/mattiax221/buslivetracker](https://github.com/mattiax221/buslivetracker)

## What it does

- **Live map** of bus/tram from the official GTT GTFS-RT vehicle positions feed
- **Line / stop search** and route shapes on the map
- **Stop arrivals** (live when available)
- **Service alerts** from GTT
- **Favorites** (lines & stops) stored in the browser
- **Share** stop/vehicle info (WhatsApp / Telegram / system share)
- **PWA** installable on phone (HTTPS required)
- **[/aggiornamenti](/aggiornamenti)** — changelog, roadmap, anonymous suggestion board, Web Push test

## What it does *not* claim

| Feature | Reality |
| --- | --- |
| Metro M1 markers | **Simulated** from a timetable model (no GPS underground) |
| Amber “stimato” markers | Position **estimated** from schedules when GPS is missing |
| Metro elevators sheet | **Static reference** data, not live ATC |
| Trip planner / AI / commute alarms | Removed — not shipped in this version |

Independent project, not affiliated with GTT.

## Stack

- Next.js (App Router) · TypeScript · Tailwind CSS v4
- Leaflet / react-leaflet · GTFS-RT · `web-push`

## Local run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional env (suggestions + push)

Copy [`.env.example`](.env.example) to `.env.local`.

1. **KV** (Upstash Redis or Vercel KV) — persists suggestion board & push subscriptions  
   - `KV_REST_API_URL`  
   - `KV_REST_API_TOKEN`  

   Without KV, suggestions work in-memory on that server instance only (ok for local try).

2. **Web Push VAPID**

```bash
npm run vapid
```

Paste the printed keys into `.env.local` / Vercel:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (e.g. `mailto:you@example.com`)

Then open **Aggiornamenti → Notifiche** → Attiva → Invia prova.

On iPhone: install the PWA to Home Screen (iOS 16.4+) for push to work.

## Deploy (Vercel)

Connect the GitHub repo, set the env vars above, deploy. HTTPS is required for GPS and push.

## Privacy (short)

- GPS stays on-device for map / nearest stop
- Suggestions are anonymous (no account); stored in your KV if configured
- Push subscriptions are device endpoints only
- Details: **Altro → Info & Privacy**

## Credits

- Vehicle positions & alerts: **GTT** open GTFS / GTFS-RT  
- Map tiles: **Esri** World Street Map  
- Stops / shapes: public transit datasets  

## License

[MIT](LICENSE)
