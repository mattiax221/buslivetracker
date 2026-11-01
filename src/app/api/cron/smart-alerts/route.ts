import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "../../../../lib/kv";
import {
  forgetPushEndpoint,
  isExpiredPushError,
  isPushConfigured,
  sendPushToSubscription,
} from "../../../../lib/push";
import { fetchStopArrivals } from "../../../../lib/stopArrivals";
import { announceLatestChangelog } from "../../../../lib/changelogPush";
import { stopPath } from "../../../../lib/mapLinks";
import {
  alertPrefId,
  listEnabledAlertPrefs,
  removeAlertPref,
} from "../../../../lib/alertPrefs";

const COOLDOWN_MS = 12 * 60 * 1000;
/** Same window as the in-app check. */
const SOON_MIN = 4;

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

  const prefs = await listEnabledAlertPrefs();
  if (!prefs) {
    return NextResponse.json({ ok: true, skipped: "migrate" });
  }

  const changelog = await announceLatestChangelog(prefs);

  let sent = 0;
  let removed = 0;
  const checked = prefs.length;

  for (const pref of prefs) {
    const stops = (pref.stops || []).slice(0, 3);
    const id = alertPrefId(pref.endpoint);
    for (const stop of stops) {
      const cdKey = `gtt:alert:cd:${id}:${stop.code}`;
      const last = Number((await kvGet(cdKey)) || "0");
      if (Date.now() - last < COOLDOWN_MS) continue;

      const hit = await nextArrivalMinutes(stop.code);
      if (!hit) continue;

      try {
        await sendPushToSubscription(pref, {
          title: `Fermata ${stop.name}`,
          body:
            hit.minutes <= 0
              ? `Linea ${hit.line}: in arrivo`
              : `Linea ${hit.line}: tra ${hit.minutes} min`,
          url: stopPath(stop.code),
        });
        await kvSet(cdKey, String(Date.now()));
        sent++;
      } catch (err) {
        if (isExpiredPushError(err)) {
          await forgetPushEndpoint(pref.endpoint);
          await removeAlertPref(pref.endpoint);
          removed++;
          break;
        }
        console.warn("smart-alert push failed", err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked,
    sent,
    removed,
    changelog,
  });
}
