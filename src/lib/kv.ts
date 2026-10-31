/**
 * Minimal Redis REST client (Upstash / Vercel KV compatible).
 * Falls back to in-memory store when env vars are missing (local/dev only).
 */

type MemoryStore = Map<string, string>;

const memory: MemoryStore = new Map();
const memoryLists: Map<string, string[]> = new Map();

function hasKvEnv(): boolean {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
}

export function isKvConfigured(): boolean {
  return hasKvEnv();
}

async function redisFetch<T = unknown>(
  command: (string | number)[]
): Promise<T | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const res = await fetch(`${url.replace(/\/$/, "")}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KV error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { result?: T };
  return (data.result ?? null) as T | null;
}

export async function kvGet(key: string): Promise<string | null> {
  if (!hasKvEnv()) {
    return memory.get(key) ?? null;
  }
  const result = await redisFetch<string | null>(["GET", key]);
  return result ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (!hasKvEnv()) {
    memory.set(key, value);
    return;
  }
  await redisFetch(["SET", key, value]);
}

/** Set only if the key is absent. Returns false when another writer holds it. */
export async function kvSetNx(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<boolean> {
  if (!hasKvEnv()) {
    if (memory.has(key)) return false;
    memory.set(key, value);
    setTimeout(() => memory.delete(key), ttlSeconds * 1000);
    return true;
  }
  const result = await redisFetch<string | null>([
    "SET",
    key,
    value,
    "NX",
    "EX",
    ttlSeconds,
  ]);
  return result === "OK";
}

/** Push JSON string to the left of a list, then trim to maxLen. */
export async function kvListPush(
  key: string,
  value: string,
  maxLen = 100
): Promise<void> {
  if (!hasKvEnv()) {
    const list = memoryLists.get(key) ?? [];
    list.unshift(value);
    memoryLists.set(key, list.slice(0, maxLen));
    return;
  }
  await redisFetch(["LPUSH", key, value]);
  await redisFetch(["LTRIM", key, 0, maxLen - 1]);
}

export async function kvListRange(
  key: string,
  start = 0,
  end = 49
): Promise<string[]> {
  if (!hasKvEnv()) {
    const list = memoryLists.get(key) ?? [];
    if (end < 0) return list.slice(start);
    return list.slice(start, end + 1);
  }
  const result = await redisFetch<string[]>(["LRANGE", key, start, end]);
  return result ?? [];
}

export async function kvListRemove(key: string, value: string): Promise<void> {
  if (!hasKvEnv()) {
    const list = memoryLists.get(key) ?? [];
    memoryLists.set(
      key,
      list.filter((row) => row !== value)
    );
    return;
  }
  await redisFetch(["LREM", key, 0, value]);
}

/** Simple fixed-window rate limit. Returns true if allowed. */
export async function kvRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  if (!hasKvEnv()) {
    const now = Date.now();
    const raw = memory.get(`rl:${key}`);
    let bucket = raw ? (JSON.parse(raw) as { n: number; reset: number }) : null;
    if (!bucket || now > bucket.reset) {
      bucket = { n: 1, reset: now + windowSeconds * 1000 };
      memory.set(`rl:${key}`, JSON.stringify(bucket));
      return true;
    }
    if (bucket.n >= limit) return false;
    bucket.n += 1;
    memory.set(`rl:${key}`, JSON.stringify(bucket));
    return true;
  }

  const count = await redisFetch<number>(["INCR", `rl:${key}`]);
  if (count === 1) {
    await redisFetch(["EXPIRE", `rl:${key}`, windowSeconds]);
  }
  return (count ?? 1) <= limit;
}
