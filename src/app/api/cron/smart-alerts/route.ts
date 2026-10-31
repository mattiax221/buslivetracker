import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvListRange, kvSet } from "../../../../lib/kv";
import {
  isPushConfigured,
  sendPushToSubscription,
  type PushSubJSON,
} from "../../../../lib/push";
import { fetchStopArrivals } from "../../../../lib/stopArrivals";

type PrefRow = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  enabled: boolean;
  lines: string[];
  stops: { code: string; name: string }[];
};

const PREFS_LIST = "gtt:alert:prefs";
const COOLDOWN_MS = 12 * 60 * 1000;
/** Wide enough that a 5-minute cron actually catches a bus. */
const SOON_MIN = 12;

async function nextArrivalMinutes(stopCode: string): Promise<{
  line: string;
  minutes: number;
} | null> {
  try {
    const arrivals = await fetchStopArrivals(stopCode);
    const soon = arrivals.find(
      (a) => a.minutesRemaining >= 0 && a.minutesRemaining <= SOON_MIN
    );
    if (!soon) return null;
    return { line: soon.line, minutes: soon.minutesRemaining };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ ok: false, reason: "no-vapid" });
  }

  const rows = await kvListRange(PREFS_LIST, 0, 199);
  const seen = new Set<string>();
  let sent = 0;
  let checked = 0;

  for (const raw of rows) {
    let pref: PrefRow;
    try {
      pref = JSON.parse(raw) as PrefRow;
    } catch {
      continue;
    }
    if (!pref.enabled || !pref.endpoint || seen.has(pref.endpoint)) continue;
    seen.add(pref.endpoint);
    checked++;

    const stops = (pref.stops || []).slice(0, 3);
    for (const stop of stops) {
      const cdKey = `gtt:alert:cd:${pref.endpoint.slice(-24)}:${stop.code}`;
      const last = Number((await kvGet(cdKey)) || "0");
      if (Date.now() - last < COOLDOWN_MS) continue;

      const hit = await nextArrivalMinutes(stop.code);
      if (!hit) continue;

      const sub: PushSubJSON = {
        endpoint: pref.endpoint,
        keys: pref.keys,
      };
      try {
        await sendPushToSubscription(sub, {
          title: `Fermata ${stop.name}`,
          body:
            hit.minutes <= 0
              ? `Linea ${hit.line}: in arrivo`
              : `Linea ${hit.line}: tra ${hit.minutes} min`,
          url: `/?stop=${stop.code}`,
        });
        await kvSet(cdKey, String(Date.now()));
        sent++;
      } catch (err) {
        console.warn("smart-alert push failed", err);
      }
    }
  }

  return NextResponse.json({ ok: true, checked, sent });
}
