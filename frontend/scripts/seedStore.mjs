/**
 * Shared seeding core for the Upstash seeders (REST + TCP).
 *
 * Both `seed-upstash.mjs` (REST) and `seed-upstash-tcp.mjs` (native protocol)
 * import from here so the dataset, key shape, and env handling stay identical:
 * every item from `backend/data/store.json` is written into the `canhav:store`
 * hash under `<PK>|<SK>` with a JSON-encoded, APPROVED-stamped value — exactly
 * the shape `lib/server/redis.ts#putItem` and the Python `RedisAdapter` use.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

export const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

/** Load `.env.local` when running outside Next (does not override real env). */
export function loadEnvLocal() {
  const envPath = path.resolve(here, "..", ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

/**
 * Read `backend/data/store.json` and build the `{ "<PK>|<SK>": jsonValue }`
 * payload. Throws (never exits) so callers control error reporting.
 */
export function buildStorePayload() {
  const storePath = path.resolve(here, "..", "..", "backend", "data", "store.json");
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(storePath, "utf-8"));
  } catch (err) {
    throw new Error(`Could not read ${storePath}: ${err instanceof Error ? err.message : err}`);
  }

  const items = Object.values(parsed.items ?? {});
  if (items.length === 0) {
    throw new Error(`No items found in ${storePath}. Run the ingest scripts first.`);
  }

  const payload = {};
  let skipped = 0;
  for (const item of items) {
    const pk = item?.PK;
    const sk = item?.SK;
    if (!pk || !sk) {
      skipped += 1;
      continue;
    }
    payload[`${pk}|${sk}`] = JSON.stringify({ ...item, Status: "APPROVED" });
  }

  const byCategory = items.reduce((acc, it) => {
    const c = it?.Category ?? "unknown";
    acc[c] = (acc[c] ?? 0) + 1;
    return acc;
  }, {});

  return { storePath, items, payload, byCategory, skipped };
}

/** Split a flat object into an array of sub-objects of at most `size` keys. */
export function chunkObject(obj, size = 100) {
  const keys = Object.keys(obj);
  const chunks = [];
  for (let i = 0; i < keys.length; i += size) {
    const chunk = {};
    for (const k of keys.slice(i, i + size)) chunk[k] = obj[k];
    chunks.push(chunk);
  }
  return chunks;
}

/** Best-effort host label for logging (never throws on a malformed URL). */
export function hostOf(urlLike) {
  try {
    return new URL(urlLike).host;
  } catch {
    return "redis";
  }
}
