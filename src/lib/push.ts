import webpush from "web-push";
import { kvGet, kvListPush, kvListRange, kvSet } from "./kv";

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
    await kvListPush(SUBS_LIST, raw, 200);
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
