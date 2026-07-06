#!/usr/bin/env node
/**
 * One-shot seeder (REST): push the local backend store into an Upstash hash
 * so the app's pages can read the dataset.
 *
 * It reads `backend/data/store.json` and HSETs every item into the
 * `canhav:store` hash under `<PK>|<SK>` with a JSON-encoded value — exactly the
 * shape `lib/server/redis.ts#putItem` and the Python `RedisAdapter` use, so the
 * frontend reads it back unchanged. Writes are chunked so a large dataset never
 * trips the Upstash REST request-size limit.
 *
 * Credentials (same ones the Vercel "Upstash for Redis" integration injects):
 *   KV_REST_API_URL + KV_REST_API_TOKEN
 *   (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
 *
 * Usage (copy the two values from the Upstash console → your DB → "REST API"):
 *   UPSTASH_REDIS_REST_URL="https://<db>.upstash.io" \
 *   UPSTASH_REDIS_REST_TOKEN="..." \
 *   node scripts/seed-upstash.mjs
 *
 * Inline env vars take precedence over `.env.local`, so you can target a
 * different DB than the app's default. Idempotent: re-running overwrites by key.
 */

import { Redis } from "@upstash/redis";

import { STORE_KEY, loadEnvLocal, buildStorePayload, chunkObject, hostOf } from "./seedStore.mjs";

loadEnvLocal();

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error(
    "Missing Upstash REST credentials. Set KV_REST_API_URL + KV_REST_API_TOKEN " +
      "(or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) before running.",
  );
  process.exit(1);
}

let built;
try {
  built = buildStorePayload();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
const { payload, byCategory, skipped } = built;
const total = Object.keys(payload).length;

const redis = new Redis({ url, token });

let n = 0;
for (const chunk of chunkObject(payload, 100)) {
  await redis.hset(STORE_KEY, chunk);
  n += Object.keys(chunk).length;
  process.stdout.write(`\r  seeded ${n}/${total}…`);
}

console.log(`\nSeeded ${n} items into hash "${STORE_KEY}" (REST → ${hostOf(url)}).`);
if (skipped) console.log(`Skipped ${skipped} item(s) without PK/SK.`);
console.log(`By category: ${JSON.stringify(byCategory)}`);
console.log("Done. Reload /stablecoins, /entities, /rwas, and /tokens.");
