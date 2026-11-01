import { createHash } from "crypto";
import {
  kvDel,
  kvGet,
  kvListPush,
  kvListRange,
  kvSet,
  kvSetAdd,
  kvSetMembers,
  kvSetNx,
  kvSetRemove,
} from "./kv";

export type AlertPref = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  enabled: boolean;
  lines: string[];
  stops: { code: string; name: string }[];
  updatedAt?: number;
};

const ENABLED_SET = "gtt:alert:enabled";
const LEGACY_LIST = "gtt:alert:prefs";
const MIGRATED_KEY = "gtt:alert:migrated";
const MIGRATE_LOCK = "gtt:alert:migrate-lock";

export function alertPrefId(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 32);
}

function prefKey(id: string): string {
  return `gtt:alert:pref:${id}`;
}

function isComplete(pref: AlertPref): boolean {
  return !!(pref.endpoint && pref.keys?.p256dh && pref.keys?.auth);
}

async function writeEnabled(pref: AlertPref): Promise<void> {
  const id = alertPrefId(pref.endpoint);
  const stored: AlertPref = {
    ...pref,
    enabled: true,
    lines: (pref.lines || []).slice(0, 5),
    stops: (pref.stops || []).slice(0, 3),
    updatedAt: pref.updatedAt ?? Date.now(),
  };
  await kvSet(prefKey(id), JSON.stringify(stored));
  await kvSetAdd(ENABLED_SET, id);
}

/** One row per device. Off deletes it, so an older copy cannot fire later. */
export async function saveAlertPref(pref: AlertPref): Promise<void> {
  const id = alertPrefId(pref.endpoint);
  const stored: AlertPref = {
    ...pref,
    enabled: !!pref.enabled,
    lines: (pref.lines || []).slice(0, 5),
    stops: (pref.stops || []).slice(0, 3),
    updatedAt: Date.now(),
  };
  if (!stored.enabled) {
    await kvDel(prefKey(id));
    await kvSetRemove(ENABLED_SET, id);
  } else {
    await writeEnabled(stored);
  }
  // Until the old append-only list is folded in, keep the latest row there too.
  if ((await kvGet(MIGRATED_KEY)) !== "1") {
    await kvListPush(LEGACY_LIST, JSON.stringify(stored), 300);
  }
}

export async function removeAlertPref(endpoint: string): Promise<void> {
  const id = alertPrefId(endpoint);
  await kvDel(prefKey(id));
  await kvSetRemove(ENABLED_SET, id);
}

/**
 * Enabled devices only. Null means a migration is already running:
 * the caller should skip this cron pass.
 */
export async function listEnabledAlertPrefs(): Promise<AlertPref[] | null> {
  const ready = await migrateLegacyPrefs();
  if (!ready) return null;

  const ids = await kvSetMembers(ENABLED_SET);
  const out: AlertPref[] = [];
  for (const id of ids) {
    const raw = await kvGet(prefKey(id));
    if (!raw) {
      await kvSetRemove(ENABLED_SET, id);
      continue;
    }
    try {
      const pref = JSON.parse(raw) as AlertPref;
      if (!pref.enabled || !isComplete(pref)) {
        await kvDel(prefKey(id));
        await kvSetRemove(ENABLED_SET, id);
        continue;
      }
      out.push(pref);
    } catch {
      await kvDel(prefKey(id));
      await kvSetRemove(ENABLED_SET, id);
    }
  }
  return out;
}

/** Newest legacy row wins. A disabled latest row stays off. */
async function migrateLegacyPrefs(): Promise<boolean> {
  if ((await kvGet(MIGRATED_KEY)) === "1") return true;

  const locked = await kvSetNx(MIGRATE_LOCK, "1", 120);
  if (!locked) {
    return (await kvGet(MIGRATED_KEY)) === "1";
  }
  if ((await kvGet(MIGRATED_KEY)) === "1") return true;

  const rows = await kvListRange(LEGACY_LIST, 0, -1);
  const seen = new Set<string>();
  for (const raw of rows) {
    let pref: AlertPref;
    try {
      pref = JSON.parse(raw) as AlertPref;
    } catch {
      continue;
    }
    if (!pref.endpoint || seen.has(pref.endpoint)) continue;
    seen.add(pref.endpoint);
    if (!pref.enabled || !isComplete(pref)) continue;
    await writeEnabled(pref);
  }
  await kvSet(MIGRATED_KEY, "1");
  return true;
}
