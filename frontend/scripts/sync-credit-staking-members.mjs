#!/usr/bin/env node
/**
 * Surgical Upstash sync for the Credit + Staking member-coin seeding.
 *
 * The generic seed-if-empty.mjs only adds MISSING keys, so it cannot propagate
 * the new MemberCoins links onto network items that already live in Redis (and
 * carry cron-written live metrics we must not clobber). This script:
 *   1. Adds the new Token items (from bootstrap-store.json) if absent.
 *   2. Merges each network's MemberCoins (union by slug+category) onto the
 *      EXISTING Redis item, preserving every other (live) field.
 *   3. Re-syncs any token whose curated fields changed (e.g. spk CoinGecko id).
 *
 * Credentials: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*).
 * Usage:
 *   node scripts/sync-credit-staking-members.mjs            # apply
 *   node scripts/sync-credit-staking-members.mjs --dry-run  # report only
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const bootstrapPath = path.join(frontendRoot, "data", "bootstrap-store.json");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";
const DRY = process.argv.includes("--dry-run");

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
loadEnvLocal();

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Missing Upstash REST credentials.");
  process.exit(1);
}

// Slugs seeded by this change (network slug -> linked member-coin slugs).
const LINKS = {
  radiant: ["rdnt"], gearbox: ["gear"], pendle: ["pendle"], notional: ["note"], spark: ["spk"],
  lido: ["steth"], "rocket-pool": ["reth"], "binance-wbeth": ["wbeth"], "coinbase-cbeth": ["cbeth"],
  "mantle-meth": ["meth"], frax: ["sfrxeth"], swell: ["sweth"], stader: ["ethx"], stakewise: ["oseth"],
  ankr: ["ankreth"], eigenlayer: ["eigen"], "ether-fi": ["weeth"], renzo: ["ezeth"], "kelp-dao": ["rseth"],
  puffer: ["pufeth"], bedrock: ["unieth"], yieldnest: ["yneth"],
};
const TOKEN_SLUGS = [...new Set(Object.values(LINKS).flat())];

const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf-8"));
const bItems = bootstrap.items;

const redis = new Redis({ url, token });
const hash = (await redis.hgetall(STORE_KEY)) || {};
const fields = new Set(Object.keys(hash));
function parse(v) { return typeof v === "string" ? JSON.parse(v) : v; }

// --verify: read back live Redis and report links + preserved metrics, then exit.
if (process.argv.includes("--verify")) {
  for (const netSlug of Object.keys(LINKS)) {
    const f = `CATEGORY#Entity|PROTOCOL#${netSlug}`;
    const it = fields.has(f) ? parse(hash[f]) : null;
    if (!it) { console.log(`${netSlug}: NOT FOUND`); continue; }
    const tvl = it.CurrentScale?.tvlUsd ?? it.CurrentScale?.value ?? null;
    const syms = (it.MemberCoins || []).map((r) => r.symbol).join(", ");
    console.log(`${netSlug.padEnd(16)} TVL=${tvl}  coins=[${syms}]`);
  }
  for (const slug of TOKEN_SLUGS) {
    const f = `CATEGORY#Token|PROTOCOL#${slug}`;
    const it = fields.has(f) ? parse(hash[f]) : null;
    console.log(it ? `TOKEN ${slug.padEnd(8)} ${it.Symbol}  status=${it.Status}  cg=${it.CoinGecko}` : `TOKEN ${slug}: MISSING`);
  }
  process.exit(0);
}

const toWrite = {};
let addedTokens = 0, updatedTokens = 0, linkedNetworks = 0;

// 1 + 3. Token items: add if missing, else re-sync curated fields from bootstrap.
for (const slug of TOKEN_SLUGS) {
  const field = `CATEGORY#Token|PROTOCOL#${slug}`;
  const desired = { ...bItems[field], Status: "APPROVED" };
  if (!fields.has(field)) {
    toWrite[field] = JSON.stringify(desired);
    addedTokens++;
  } else {
    // Preserve live fields (Market, TotalSupply, ProtocolFeesRevenue...) but
    // refresh curated identity fields that may have changed (e.g. CoinGecko).
    const live = parse(hash[field]);
    const merged = { ...live, CoinGecko: desired.CoinGecko, EntitySlug: desired.EntitySlug, Status: "APPROVED" };
    if (JSON.stringify(merged) !== JSON.stringify(live)) {
      toWrite[field] = JSON.stringify(merged);
      updatedTokens++;
    }
  }
}

// 2. Network MemberCoins: union onto the existing live item (any PK variant).
function findNetworkField(slug) {
  for (const pk of ["CATEGORY#Entity", "CATEGORY#Network"]) {
    const f = `${pk}|PROTOCOL#${slug}`;
    if (fields.has(f)) return f;
  }
  return null;
}
const missingNetworks = [];
for (const netSlug of Object.keys(LINKS)) {
  const field = findNetworkField(netSlug);
  if (!field) { missingNetworks.push(netSlug); continue; }
  const live = parse(hash[field]);
  const bootRefs = (bItems[`CATEGORY#Entity|PROTOCOL#${netSlug}`]?.MemberCoins) || [];
  const liveRefs = live.MemberCoins || [];
  const seen = new Set(liveRefs.map((r) => `${r.category}:${r.slug}`));
  let changed = false;
  for (const r of bootRefs) {
    const key = `${r.category}:${r.slug}`;
    if (!seen.has(key)) { liveRefs.push(r); seen.add(key); changed = true; }
  }
  if (changed) {
    live.MemberCoins = liveRefs;
    toWrite[field] = JSON.stringify(live);
    linkedNetworks++;
  }
}

console.log(`Plan: +${addedTokens} new tokens, ${updatedTokens} token re-syncs, ${linkedNetworks} networks linked.`);
if (missingNetworks.length) console.warn("WARN networks not found in Redis:", missingNetworks);

if (DRY) { console.log("--dry-run; no writes."); process.exit(0); }
if (Object.keys(toWrite).length === 0) { console.log("Nothing to write."); process.exit(0); }
await redis.hset(STORE_KEY, toWrite);
console.log(`Wrote ${Object.keys(toWrite).length} field(s) to "${STORE_KEY}".`);
