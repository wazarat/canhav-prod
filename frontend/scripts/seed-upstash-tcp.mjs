#!/usr/bin/env node
/**
 * One-shot seeder (native TCP protocol): same dataset and key shape as
 * `seed-upstash.mjs`, but connects with a `redis://` / `rediss://` connection
 * string via ioredis instead of the REST API. Useful when you have the CLI
 * connection string for a DB but not its REST token.
 *
 * Upstash requires TLS on the native endpoint, so TLS is enabled automatically
 * for `redis://` URLs too (a `rediss://` URL already implies it).
 *
 * Usage:
 *   REDIS_URL="redis://<user>:<password>@<host>.upstash.io:6379" \
 *     node scripts/seed-upstash-tcp.mjs
 *   # or pass the URL as an argument:
 *   node scripts/seed-upstash-tcp.mjs "redis://<user>:<password>@<host>:6379"
 *
 * Flags:
 *   --dry-run   build + summarise the payload only; do NOT connect or write.
 *   --check     connect, PING and report the hash size; do NOT write.
 *
 * Idempotent: re-running overwrites items by key.
 */

import Redis from "ioredis";

import { STORE_KEY, loadEnvLocal, buildStorePayload, chunkObject, hostOf } from "./seedStore.mjs";

loadEnvLocal();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const checkOnly = args.includes("--check");
const urlArg = args.find((a) => a.startsWith("redis://") || a.startsWith("rediss://"));
const url = urlArg || process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || "";

let built;
try {
  built = buildStorePayload();
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
const { payload, byCategory, skipped } = built;
const total = Object.keys(payload).length;

console.log(`Prepared ${total} items from backend/data/store.json.`);
if (skipped) console.log(`(skipped ${skipped} item(s) without PK/SK)`);
console.log(`By category: ${JSON.stringify(byCategory)}`);

if (dryRun) {
  console.log("--dry-run: no connection made. Done.");
  process.exit(0);
}

if (!url) {
  console.error(
    "No connection string. Pass REDIS_URL=\"redis://...:6379\" (or a redis:// argument).",
  );
  process.exit(1);
}

const redis = new Redis(url, {
  // Upstash's native endpoint needs TLS; enable it for redis:// too.
  tls: url.startsWith("rediss://") ? undefined : {},
  connectTimeout: 15_000,
  maxRetriesPerRequest: 2,
  // Upstash ACL users often lack the INFO command; skip ioredis's INFO-based
  // ready check so it doesn't warn/fail on NOPERM.
  enableReadyCheck: false,
  // Fail fast on bad host/credentials rather than retrying forever.
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2_000)),
});

// Surface async connection errors instead of letting ioredis retry silently.
redis.on("error", (err) => {
  console.error(`\nRedis error: ${err?.message ?? err}`);
});

try {
  const pong = await redis.ping();
  console.log(`Connected (${hostOf(url)}): PING → ${pong}`);

  const before = await redis.hlen(STORE_KEY);
  console.log(`Current hash "${STORE_KEY}" holds ${before} field(s).`);

  if (checkOnly) {
    console.log("--check: no writes performed. Done.");
    await redis.quit();
    process.exit(0);
  }

  let n = 0;
  for (const chunk of chunkObject(payload, 100)) {
    // ioredis accepts a flat object for HSET.
    await redis.hset(STORE_KEY, chunk);
    n += Object.keys(chunk).length;
    process.stdout.write(`\r  seeded ${n}/${total}…`);
  }

  const after = await redis.hlen(STORE_KEY);
  console.log(`\nSeeded ${n} items into "${STORE_KEY}" (TCP → ${hostOf(url)}). Hash now holds ${after} field(s).`);
  console.log(`By category: ${JSON.stringify(byCategory)}`);
  await redis.quit();
  process.exit(0);
} catch (err) {
  console.error(`\nFailed: ${err instanceof Error ? err.message : String(err)}`);
  redis.disconnect();
  process.exit(1);
}
