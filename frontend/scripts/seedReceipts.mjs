#!/usr/bin/env node
/**
 * Seed receipt tokens into Upstash Redis from frontend/data/seed/receipts.json.
 * For local/bootstrap seeding, run: python3 frontend/scripts/seed-coins-receipts.py --receipts
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const receiptsPath = path.resolve(here, "..", "data", "seed", "receipts.json");

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

const receipts = JSON.parse(readFileSync(receiptsPath, "utf-8"));
const redis = new Redis({ url, token });
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

let written = 0;
for (const r of receipts) {
  const item = {
    PK: "CATEGORY#Receipt",
    SK: `PROTOCOL#${r.slug}`,
    Category: "Receipt",
    Slug: r.slug,
    Name: r.name,
    Symbol: r.symbol,
    Status: "APPROVED",
    ReceiptType: r.receiptType,
    EntitySlug: r.entitySlug,
    BaseAsset: r.baseAsset ?? null,
    Sector: r.sector,
    Tag: r.tag,
    Notes: r.notes ?? "",
    CoinGecko: r.geckoId ? `https://www.coingecko.com/en/coins/${r.geckoId}` : null,
    UpdatedAt: now,
  };
  await redis.hset(STORE_KEY, { [`CATEGORY#Receipt|PROTOCOL#${r.slug}`]: JSON.stringify(item) });
  written += 1;
}

console.log(`seedReceipts: wrote ${written} receipt items to Redis`);
