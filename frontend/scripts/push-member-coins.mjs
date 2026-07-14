#!/usr/bin/env node
/**
 * Surgical, NON-DESTRUCTIVE push of the MemberCoins backfill to Upstash.
 *
 * `mergeCuratedContent` (seed-if-empty / patch-store-content) does NOT merge
 * `MemberCoins`, so the backfill in bootstrap-store.json will not reach an
 * already-seeded Redis hash via those scripts. This script fills that gap:
 * for every network (CATEGORY#Entity) key it reads the CURRENT Redis item,
 * replaces ONLY `MemberCoins` (+ `UpdatedAt`) with the bootstrap value, and
 * writes it back — every live cron field (Market, TVL, metrics) is preserved.
 *
 * Idempotent: only writes keys whose MemberCoins actually differ.
 *
 * Credentials (same as the app / other seeders):
 *   KV_REST_API_URL + KV_REST_API_TOKEN   (or UPSTASH_REDIS_REST_URL/_TOKEN)
 *
 * Usage:
 *   node scripts/push-member-coins.mjs                 # apply
 *   PATCH_DRY_RUN=1 node scripts/push-member-coins.mjs # report only
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const bootstrapPath = path.join(frontendRoot, "data", "bootstrap-store.json");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

function loadEnvLocal() {
  const envPath = path.join(frontendRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const eq = t.indexOf("=");
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

function parse(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return null; } }
  return typeof raw === "object" ? raw : null;
}

loadEnvLocal();
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const dryRun = process.env.PATCH_DRY_RUN === "1";

if (!url || !token) {
  console.error("Missing Upstash REST credentials (KV_REST_API_URL + KV_REST_API_TOKEN).");
  process.exit(1);
}

const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf-8"));
const bootstrapByKey = bootstrap.items ?? {};

const redis = new Redis({ url, token });
const existingRaw = (await redis.hgetall(STORE_KEY)) ?? {};

const toWrite = {};
let changed = 0;
const changedKeys = [];

for (const [field, item] of Object.entries(bootstrapByKey)) {
  if (!field.startsWith("CATEGORY#Entity|")) continue;
  const bootMembers = item?.MemberCoins ?? [];
  const rawExisting = existingRaw[field];
  if (rawExisting == null) continue; // key not in Redis yet — seed-if-empty adds it wholesale
  const existingItem = parse(rawExisting);
  if (!existingItem) continue;
  if (JSON.stringify(existingItem.MemberCoins ?? []) === JSON.stringify(bootMembers)) continue;
  const merged = { ...existingItem, MemberCoins: bootMembers, UpdatedAt: item.UpdatedAt ?? existingItem.UpdatedAt };
  toWrite[field] = JSON.stringify(merged);
  changed += 1;
  changedKeys.push(`${field.replace("CATEGORY#Entity|PROTOCOL#", "")} (${bootMembers.length})`);
}

if (changed === 0) {
  console.log("No MemberCoins differences — Redis already in sync.");
  process.exit(0);
}

console.log(`MemberCoins differs on ${changed} network(s):`);
console.log("  " + changedKeys.sort().join(", "));

if (dryRun) {
  console.log(`\n[dry-run] would HSET ${changed} key(s). No write performed.`);
  process.exit(0);
}

await redis.hset(STORE_KEY, toWrite);
console.log(`\nWrote MemberCoins for ${changed} network(s) into "${STORE_KEY}". Live metric fields untouched.`);
