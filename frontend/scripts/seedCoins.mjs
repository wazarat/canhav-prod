#!/usr/bin/env node
/**
 * Seed primary coins into Upstash Redis from frontend/data/seed/coins.json.
 * For local/bootstrap seeding, run: python3 frontend/scripts/seed-coins-receipts.py --coins
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const coinsPath = path.resolve(here, "..", "data", "seed", "coins.json");

function loadEnvLocal() {
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

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

if (!url || !token) {
  console.error("Missing Upstash credentials.");
  process.exit(1);
}

const coins = JSON.parse(readFileSync(coinsPath, "utf-8"));
const redis = new Redis({ url, token });
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

let written = 0;
for (const c of coins) {
  const category = c.isStablecoin ? "Stablecoin" : "Token";
  const item = {
    PK: `CATEGORY#${category}`,
    SK: `PROTOCOL#${c.slug}`,
    Category: category,
    Slug: c.slug,
    Name: c.name,
    Symbol: c.symbol,
    Status: "APPROVED",
    CoinType: c.coinType,
    EntitySlug: c.entitySlug,
    IsStablecoin: c.isStablecoin,
    Sector: c.sector,
    Tag: c.tag,
    CoinGecko: c.geckoId ? `https://www.coingecko.com/en/coins/${c.geckoId}` : null,
    UpdatedAt: now,
  };
  await redis.hset(STORE_KEY, { [`CATEGORY#${category}|PROTOCOL#${c.slug}`]: JSON.stringify(item) });
  written += 1;
}

console.log(`seedCoins: wrote ${written} coin items to Redis`);
