import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Server-only Upstash Redis client + store accessors.
 *
 * The entire single-table store lives in ONE Redis hash (default `canhav:store`):
 * field = `<PK>|<SK>` (e.g. `CATEGORY#Stablecoin|PROTOCOL#usdc`), value = the
 * JSON item. This mirrors the Python adapters exactly, so the Next.js app and the
 * Python ops jobs read/write the same shape.
 *
 * Reads happen at request/build time (ISR); the only write is the approval flip
 * in /api/approve. When Upstash env vars are absent (pure offline dev), callers
 * fall back to the local `backend/data/store.json` via `lib/server/store.ts`.
 */

export const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

/** Whether Upstash REST credentials are configured in the environment. */
export function hasUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    // Uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
    _redis = Redis.fromEnv();
  }
  return _redis;
}

/** Normalize a hash value that may be a JSON string or an already-parsed object. */
function parseItem(value: unknown): Record<string, any> | null {
  if (value == null) return null;
  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, any>;
    } catch {
      return null;
    }
  }
  return null;
}

function fieldKey(category: string, slug: string): string {
  return `CATEGORY#${category}|PROTOCOL#${slug}`;
}

/** Read every store item from the Upstash hash. */
export async function readAllItemsFromRedis(): Promise<Record<string, any>[]> {
  const raw = (await getRedis().hgetall(STORE_KEY)) as Record<string, unknown> | null;
  if (!raw) return [];
  const items: Record<string, any>[] = [];
  for (const value of Object.values(raw)) {
    const parsed = parseItem(value);
    if (parsed) items.push(parsed);
  }
  return items;
}

/**
 * Flip a protocol's approval status in Upstash. Returns the updated item, or
 * `null` if the protocol does not exist. Mirrors `update_status` in the Python
 * adapters (sets `Status` + `UpdatedAt`).
 */
export async function setStatus(
  category: string,
  slug: string,
  status: "APPROVED" | "PENDING_APPROVAL",
): Promise<Record<string, any> | null> {
  const redis = getRedis();
  const field = fieldKey(category, slug);
  const item = parseItem(await redis.hget(STORE_KEY, field));
  if (!item) return null;
  item.Status = status;
  item.UpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  await redis.hset(STORE_KEY, { [field]: JSON.stringify(item) });
  return item;
}
