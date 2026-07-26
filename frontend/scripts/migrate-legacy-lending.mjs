#!/usr/bin/env node
/**
 * M4.1 (CAN-70) one-time migration: copy the METRIC fields of the legacy
 * `Lending` block into `CreditTagMetrics.lending` so the tag block becomes
 * the single lending metrics representation.
 *
 * Copied (only when the tag block does not already have a value):
 *   numeric Sourced cells: tvlUsd -> totalSuppliedUsd, totalBorrowsUsd,
 *     utilizationPct, availableLiquidityUsd, supplyApyPct, borrowApyPct,
 *     netInterestMarginPct, activeUsers
 *   curated lists/structs: collateralAssets, loanAssets, oracles,
 *     liquidations30d, governanceDetail
 *
 * NOT copied (editorial content that stays on the legacy block for the Asset
 * Coverage tab): riskParameters, auditHistory, deployment, stablecoinExposure,
 * badDebt/liquidations/governanceActivity prose.
 *
 * The legacy block itself is left in place; the strip pass (after one prod
 * verification cycle) removes its numeric fields.
 *
 * Usage:
 *   PATCH_DRY_RUN=1 node frontend/scripts/migrate-legacy-lending.mjs (report)
 *   node frontend/scripts/migrate-legacy-lending.mjs                 (writes)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(frontendRoot, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^"|"$/g, "");
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
}

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const dryRun = process.env.PATCH_DRY_RUN === "1";
if (!url || !token) {
  console.error("Missing KV_REST_API_URL / KV_REST_API_TOKEN.");
  process.exit(1);
}
const redis = new Redis({ url, token });

/** legacy Lending field -> CreditTagMetrics.lending field. */
const SOURCED_MAP = {
  tvlUsd: "totalSuppliedUsd",
  totalBorrowsUsd: "totalBorrowsUsd",
  utilizationPct: "utilizationPct",
  availableLiquidityUsd: "availableLiquidityUsd",
  supplyApyPct: "supplyApyPct",
  borrowApyPct: "borrowApyPct",
  netInterestMarginPct: "netInterestMarginPct",
  activeUsers: "activeUsers",
};
const PLAIN_MAP = {
  collateralAssets: "collateralAssets",
  loanAssets: "loanAssets",
  oracles: "oracles",
  liquidations30d: "liquidations30d",
  governanceDetail: "governanceDetail",
};

const fields = await redis.hkeys(STORE_KEY);
const entityFields = fields.filter((f) => f.startsWith("CATEGORY#Entity|"));
console.log(`${entityFields.length} entity items in store.`);

let changed = 0;
const toWrite = {};
for (const field of entityFields) {
  const raw = await redis.hget(STORE_KEY, field);
  if (raw == null) continue;
  const it = typeof raw === "string" ? JSON.parse(raw) : raw;
  const legacy = it.Lending;
  if (!legacy || typeof legacy !== "object") continue;

  const slug = field.split("PROTOCOL#")[1] ?? field;
  const ctm = it.CreditTagMetrics && typeof it.CreditTagMetrics === "object" ? it.CreditTagMetrics : {};
  const lending = ctm.lending && typeof ctm.lending === "object" ? ctm.lending : {};
  const copied = [];

  for (const [from, to] of Object.entries(SOURCED_MAP)) {
    const cell = legacy[from];
    if (cell == null || typeof cell !== "object" || cell.value == null) continue;
    if (lending[to]?.value != null) continue;
    lending[to] = cell;
    copied.push(`${from}->${to}`);
  }
  for (const [from, to] of Object.entries(PLAIN_MAP)) {
    const v = legacy[from];
    if (v == null || (Array.isArray(v) && v.length === 0)) continue;
    const existing = lending[to];
    if (existing != null && !(Array.isArray(existing) && existing.length === 0)) continue;
    lending[to] = v;
    copied.push(`${from}->${to}`);
  }

  if (copied.length === 0) {
    console.log(`OK (nothing to copy): ${slug}`);
    continue;
  }
  const patched = { ...it, CreditTagMetrics: { ...ctm, lending } };
  patched.UpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  toWrite[field] = JSON.stringify(patched);
  changed += 1;
  console.log(`MIGRATE ${slug}: ${copied.join(", ")}`);
}

if (changed === 0) {
  console.log("Nothing to write.");
} else if (dryRun) {
  console.log(`\n[dry-run] would HSET ${changed} key(s). No write performed.`);
} else {
  await redis.hset(STORE_KEY, toWrite);
  console.log(`\nWrote ${changed} migrated item(s) into "${STORE_KEY}".`);
}
