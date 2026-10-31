import { CHANGELOG } from "./updatesContent";
import { kvGet, kvSet, kvSetNx } from "./kv";
import { broadcastPush } from "./push";

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
 * One push per changelog version, to every device with notifications on.
 * The 5-minute cron calls this; a lock stops two runs from sending twice.
 */
export async function announceLatestChangelog(): Promise<ChangelogAnnounceResult> {
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
  try {
    const result = await broadcastPush({
      title: `Novità ${latest.version}`,
      body: `${latest.title}. ${body}`,
      url: "/aggiornamenti",
    });
    if (result.sent > 0 || result.failed === 0) {
      await kvSet(SENT_KEY, latest.version);
    }
    return {
      ok: true,
      version: latest.version,
      sent: result.sent,
      failed: result.failed,
      removed: result.removed,
    };
  } catch (err) {
    console.warn("changelog announce failed", err);
    return {
      ok: false,
      version: latest.version,
      error: err instanceof Error ? err.message : "announce failed",
    };
  }
}
