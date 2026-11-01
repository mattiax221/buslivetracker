import { CHANGELOG } from "./updatesContent";
import { kvGet, kvSet, kvSetNx } from "./kv";
import { forgetPushEndpoint, isExpiredPushError, sendPushToSubscription } from "./push";
import { removeAlertPref, type AlertPref } from "./alertPrefs";

const SENT_KEY = "gtt:changelog:sent";
const LOCK_KEY = "gtt:changelog:lock";

export type ChangelogAnnounceResult = {
  ok: boolean;
  skipped?: boolean;
  version?: string;
  sent?: number;
  failed?: number;
  removed?: number;
  error?: string;
};

/**
 * One push per changelog version, only to devices with favorite alerts on.
 * The 5-minute cron calls this; a lock stops two runs from sending twice.
 */
export async function announceLatestChangelog(
  prefs: AlertPref[]
): Promise<ChangelogAnnounceResult> {
  const latest = CHANGELOG[0];
  if (!latest) return { ok: true, skipped: true };

  const already = await kvGet(SENT_KEY);
  if (already === latest.version) {
    return { ok: true, skipped: true, version: latest.version };
  }

  const locked = await kvSetNx(LOCK_KEY, latest.version, 180);
  if (!locked) {
    return { ok: true, skipped: true, version: latest.version };
  }

  const again = await kvGet(SENT_KEY);
  if (again === latest.version) {
    return { ok: true, skipped: true, version: latest.version };
  }

  const body = latest.items[0]?.trim() || latest.title;
  let sent = 0;
  let failed = 0;
  let removed = 0;
  try {
    for (const pref of prefs) {
      try {
        await sendPushToSubscription(pref, {
          title: `Novità ${latest.version}`,
          body: `${latest.title}. ${body}`,
          url: "/aggiornamenti",
        });
        sent++;
      } catch (err) {
        if (isExpiredPushError(err)) {
          await forgetPushEndpoint(pref.endpoint);
          await removeAlertPref(pref.endpoint);
          removed++;
        } else {
          failed++;
          console.warn("changelog push failed", err);
        }
      }
    }
    if (sent > 0 || failed === 0) {
      await kvSet(SENT_KEY, latest.version);
    }
    return { ok: true, version: latest.version, sent, failed, removed };
  } catch (err) {
    console.warn("changelog announce failed", err);
    return {
      ok: false,
      version: latest.version,
      error: err instanceof Error ? err.message : "announce failed",
    };
  }
}
