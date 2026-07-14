#!/usr/bin/env node
/**
 * Surgical, NON-DESTRUCTIVE push of the MemberCoins backfill to Upstash over the
 * native TCP protocol (ioredis) — for DBs where you have the redis:// connection
 * string but no REST token. TCP twin of `push-member-coins.mjs`.
 *
 * For every network (CATEGORY#Entity) key it HGETs the CURRENT Redis item,
 * replaces ONLY `MemberCoins` (+ `UpdatedAt`) with the value from
 * bootstrap-store.json, and HSETs it back — every live cron field (Market, TVL,
 * metrics, Status) is preserved. Idempotent: only writes keys whose MemberCoins
 * actually differ.
 *
 * Usage:
 *   node scripts/push-member-coins-tcp.mjs "redis://user:pass@host.upstash.io:6379"
 *   node scripts/push-member-coins-tcp.mjs "redis://..." --dry-run   # connect + report, NO write
 *   REDIS_URL="redis://..." node scripts/push-member-coins-tcp.mjs
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Redis from "ioredis";

const here = path.dirname(fileURLToPath(import.meta.url));
const bootstrapPath = path.join(here, "..", "data", "bootstrap-store.json");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const urlArg = args.find((a) => a.startsWith("redis://") || a.startsWith("rediss://"));
const url = urlArg || process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || "";

if (!url) {
  console.error('No connection string. Pass "redis://user:pass@host:6379" as an argument (or set REDIS_URL).');
  process.exit(1);
}

const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf-8"));
const bootstrapByKey = bootstrap.items ?? {};

const redis = new Redis(url, {
  tls: url.startsWith("rediss://") ? undefined : {},
  connectTimeout: 15_000,
  maxRetriesPerRequest: 2,
  enableReadyCheck: false,
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2_000)),
});
redis.on("error", (err) => console.error(`\nRedis error: ${err?.message ?? err}`));

function parse(raw) {
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

try {
  const pong = await redis.ping();
  const host = new URL(url).host;
  console.log(`Connected (${host}): PING → ${pong}`);
  console.log(`Hash "${STORE_KEY}" holds ${await redis.hlen(STORE_KEY)} field(s).`);

  const toWrite = {};
  const changedKeys = [];
  let missing = 0;

  for (const [field, item] of Object.entries(bootstrapByKey)) {
    if (!field.startsWith("CATEGORY#Entity|")) continue;
    const bootMembers = item?.MemberCoins ?? [];
    const rawExisting = await redis.hget(STORE_KEY, field);
    if (rawExisting == null) { missing += 1; continue; } // not in Redis yet
    const existingItem = parse(rawExisting);
    if (!existingItem) continue;
    if (JSON.stringify(existingItem.MemberCoins ?? []) === JSON.stringify(bootMembers)) continue;
    const merged = { ...existingItem, MemberCoins: bootMembers, UpdatedAt: item.UpdatedAt ?? existingItem.UpdatedAt };
    toWrite[field] = JSON.stringify(merged);
    changedKeys.push(`${field.replace("CATEGORY#Entity|PROTOCOL#", "")} (${bootMembers.length})`);
  }

  const changed = Object.keys(toWrite).length;
  if (missing) console.log(`(${missing} bootstrap Entity key(s) not present in Redis — skipped)`);

  if (changed === 0) {
    console.log("No MemberCoins differences — Redis already in sync.");
    await redis.quit();
    process.exit(0);
  }

  console.log(`MemberCoins differs on ${changed} network(s):`);
  console.log("  " + changedKeys.sort().join(", "));

  if (dryRun) {
    console.log(`\n--dry-run: no write performed.`);
    await redis.quit();
    process.exit(0);
  }

  await redis.hset(STORE_KEY, toWrite);
  console.log(`\nWrote MemberCoins for ${changed} network(s) into "${STORE_KEY}" (TCP → ${host}). Live metric fields untouched.`);
  await redis.quit();
  process.exit(0);
} catch (err) {
  console.error(`\nFailed: ${err instanceof Error ? err.message : String(err)}`);
  redis.disconnect();
  process.exit(1);
}
