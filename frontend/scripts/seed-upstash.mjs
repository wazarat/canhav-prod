#!/usr/bin/env node
/**
 * One-shot seeder: push the local backend store into the production Upstash
 * hash so production pages can read the dataset.
 *
 * It reads `backend/data/store.json` and HSETs every item into the
 * `canhav:store` hash under `<PK>|<SK>` with a JSON-encoded value — exactly the
 * shape `lib/server/redis.ts#putItem` and the Python `RedisAdapter` use, so the
 * frontend reads it back unchanged.
 *
 * Credentials (same ones the Vercel "Upstash for Redis" integration injects):
 *   KV_REST_API_URL + KV_REST_API_TOKEN
 *   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *
 * Usage (copy the two values from Vercel → Settings → Environment Variables):
 *   KV_REST_API_URL="https://...upstash.io" \
 *   KV_REST_API_TOKEN="..." \
 *   node scripts/seed-upstash.mjs
 *
 * Idempotent: re-running overwrites items by key and never duplicates.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Redis } from "@upstash/redis";

/** Load `.env.local` when running outside Next (seed script has no built-in env pull). */
function loadEnvLocal() {
  const here = path.dirname(fileURLToPath(import.meta.url));
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

loadEnvLocal();

const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error(
    "Missing Upstash REST credentials. Set KV_REST_API_URL + KV_REST_API_TOKEN " +
      "(or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) before running.",
  );
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.resolve(here, "..", "..", "backend", "data", "store.json");

let parsed;
try {
  parsed = JSON.parse(readFileSync(storePath, "utf-8"));
} catch (err) {
  console.error(`Could not read ${storePath}: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

const items = Object.values(parsed.items ?? {});
if (items.length === 0) {
  console.error(`No items found in ${storePath}. Run the ingest scripts first.`);
  process.exit(1);
}

const payload = {};
for (const item of items) {
  const pk = item?.PK;
  const sk = item?.SK;
  if (!pk || !sk) {
    console.warn(`Skipping item without PK/SK: ${JSON.stringify(item).slice(0, 80)}…`);
    continue;
  }
  payload[`${pk}|${sk}`] = JSON.stringify({ ...item, Status: "APPROVED" });
}

const redis = new Redis({ url, token });

const fields = Object.keys(payload);
await redis.hset(STORE_KEY, payload);

const byCategory = items.reduce((acc, it) => {
  const c = it?.Category ?? "unknown";
  acc[c] = (acc[c] ?? 0) + 1;
  return acc;
}, {});

console.log(`Seeded ${fields.length} items into hash "${STORE_KEY}".`);
console.log(`By category: ${JSON.stringify(byCategory)}`);
console.log("Done. Reload /stablecoins, /entities, /rwas, and /tokens.");
