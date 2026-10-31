import webpush from "web-push";
import { kvGet, kvListPush, kvListRange, kvListRemove, kvSet } from "./kv";

const SUBS_LIST = "gtt:push:subs";
const SUB_INDEX_PREFIX = "gtt:push:by:";

export type PushSubJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@localhost";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export function isPushConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY
  );
}

function endpointKey(endpoint: string): string {
  // short stable id from endpoint
  let h = 0;
  for (let i = 0; i < endpoint.length; i++) {
    h = (h * 31 + endpoint.charCodeAt(i)) | 0;
  }
  return `${SUB_INDEX_PREFIX}${Math.abs(h).toString(36)}`;
}

export async function saveSubscription(sub: PushSubJSON): Promise<void> {
  const raw = JSON.stringify(sub);
  await kvSet(endpointKey(sub.endpoint), raw);
  // Keep a list for admin broadcast later; dedupe lightly by rewriting list filter
  const existing = await kvListRange(SUBS_LIST, 0, 199);
  if (!existing.some((row) => {
    try {
      return (JSON.parse(row) as PushSubJSON).endpoint === sub.endpoint;
    } catch {
      return false;
    }
  })) {
    await kvListPush(SUBS_LIST, raw, 2000);
  }
}

export async function findSubscription(
  endpoint: string
): Promise<PushSubJSON | null> {
  const raw = await kvGet(endpointKey(endpoint));
  if (raw) {
    try {
      return JSON.parse(raw) as PushSubJSON;
    } catch {
      return null;
    }
  }
  const all = await kvListRange(SUBS_LIST, 0, 199);
  for (const row of all) {
    try {
      const s = JSON.parse(row) as PushSubJSON;
      if (s.endpoint === endpoint) return s;
    } catch {
      /* skip */
    }
  }
  return null;
}

export async function listSubscriptions(): Promise<
  { raw: string; sub: PushSubJSON }[]
> {
  const rows = await kvListRange(SUBS_LIST, 0, -1);
  const seen = new Set<string>();
  const out: { raw: string; sub: PushSubJSON }[] = [];
  for (const raw of rows) {
    try {
      const sub = JSON.parse(raw) as PushSubJSON;
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      if (seen.has(sub.endpoint)) continue;
      seen.add(sub.endpoint);
      out.push({ raw, sub });
    } catch {
      /* skip */
    }
  }
  return out;
}

function isExpiredSubscription(err: unknown): boolean {
  const status = (err as { statusCode?: number })?.statusCode;
  return status === 404 || status === 410;
}

/** Push to every device that turned notifications on. Drops dead subscriptions. */
export async function broadcastPush(payload: {
  title: string;
  body: string;
  url?: string;
}): Promise<{ sent: number; failed: number; removed: number }> {
  if (!configureWebPush()) {
    throw new Error("VAPID non configurato");
  }
  const subs = await listSubscriptions();
  let sent = 0;
  let failed = 0;
  let removed = 0;
  for (const { raw, sub } of subs) {
    try {
      await sendPushToSubscription(sub, payload);
      sent++;
    } catch (err) {
      if (isExpiredSubscription(err)) {
        await kvListRemove(SUBS_LIST, raw);
        removed++;
      } else {
        failed++;
        console.warn("broadcast push failed", err);
      }
    }
  }
  return { sent, failed, removed };
}

export async function sendPushToSubscription(
  sub: PushSubJSON,
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (!configureWebPush()) {
    throw new Error("VAPID non configurato");
  }
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: sub.keys,
    },
    JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
    })
  );
}
