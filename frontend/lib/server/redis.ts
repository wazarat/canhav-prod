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
 * When Upstash env vars are absent (pure offline dev), callers
 * fall back to the local `backend/data/store.json` via `lib/server/store.ts`.
 *
 * Credentials come from either the Vercel "Upstash for Redis" integration
 * (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) or a native Upstash project
 * (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`); see `restUrl`/`restToken`.
 */

export const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

/**
 * Resolve the Upstash REST credentials. The Vercel Marketplace "Upstash for
 * Redis" integration injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (it keeps
 * the legacy Vercel KV prefix), while a manually-configured Upstash project uses
 * `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`. Accept either so the app
 * works regardless of how the store was provisioned.
 */
function restUrl(): string | undefined {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
}

function restToken(): string | undefined {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
}

/** Whether Upstash REST credentials are configured in the environment. */
export function hasUpstash(): boolean {
  return Boolean(restUrl() && restToken());
}

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = restUrl();
    const token = restToken();
    if (!url || !token) {
      throw new Error(
        "Upstash REST credentials are missing. Set KV_REST_API_URL + " +
          "KV_REST_API_TOKEN (Vercel integration) or UPSTASH_REDIS_REST_URL + " +
          "UPSTASH_REDIS_REST_TOKEN.",
      );
    }
    _redis = new Redis({ url, token });
  }
  return _redis;
}

/**
 * Shared Upstash client accessor for other server-only modules (e.g. the agent
 * memory layer). Throws if credentials are missing — callers should guard with
 * {@link hasUpstash} and fall back accordingly.
 */
export function getRedisClient(): Redis {
  return getRedis();
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
 * Write a full store item back to the Upstash hash (HSET by `<PK>|<SK>`).
 * Used by the live-metrics cron. Mirrors `put_item` in the Python adapters.
 */
export async function putItem(item: Record<string, any>): Promise<void> {
  const pk = item.PK;
  const sk = item.SK;
  if (!pk || !sk) throw new Error("Item must include both 'PK' and 'SK'.");
  await getRedis().hset(STORE_KEY, { [`${pk}|${sk}`]: JSON.stringify(item) });
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
