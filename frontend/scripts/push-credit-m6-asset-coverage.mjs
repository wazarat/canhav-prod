#!/usr/bin/env node
/**
 * Credit M6 Asset Coverage push (Credits completion CAN-75/72/77).
 *
 * REPLACE-PER-FIELD for exactly the 14 tagged Credit entities (same
 * user-approved policy as M5). Fields written, and nothing else:
 *   - AssetCoverage  (new M6 block; sense deliberately gets none — its
 *     Asset coverage tab stays hidden per CAN-72)
 *   - Incidents      (52 dataset incidents replace the sparse legacy rows)
 *   - TypedRisks     (the LIVE M5 rows patched with link-only additions:
 *     linkedAssetsUnmatched / linkedPartnersUnmatched / linkedFlaggedAssets)
 *   - UpdatedAt
 *
 * Source sidecar: scripts/data/credit-m6-asset-coverage.json
 * (parse-credit-m6-asset-coverage.mjs — its fidelity gates must pass first).
 *
 * Modes (same contract as push-credit-m5-research.mjs):
 *   node scripts/push-credit-m6-asset-coverage.mjs --local
 *   PATCH_DRY_RUN=1 node scripts/push-credit-m6-asset-coverage.mjs
 *   node scripts/push-credit-m6-asset-coverage.mjs
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const sidecar = JSON.parse(
  readFileSync(path.join(here, "data", "credit-m6-asset-coverage.json"), "utf-8"),
);

const SLUGS = Object.keys(sidecar.entities).sort();
if (SLUGS.length !== 14) {
  console.error(`Expected 14 slugs in the M6 sidecar, found ${SLUGS.length}.`);
  process.exit(1);
}

const FIELDS = ["AssetCoverage", "Incidents", "TypedRisks"];

function summarize(value) {
  if (value == null) return "-";
  if (Array.isArray(value)) return `${value.length} rows`;
  if (typeof value === "object" && Array.isArray(value.assets)) {
    return `${value.assets.length} assets/${value.oracles.length} oracles/${value.flaggedAssets.length} flagged`;
  }
  if (typeof value === "string") return `${value.length} chars`;
  return typeof value;
}

const isEmpty = (v) => v == null || (Array.isArray(v) && v.length === 0);

/** Mutates record; returns diff lines. */
function applyCoverage(record, slug) {
  const diffs = [];
  for (const field of FIELDS) {
    const next = sidecar.entities[slug][field];
    const prev = record[field];
    if (isEmpty(next)) {
      if (!isEmpty(prev)) {
        delete record[field];
        diffs.push(`${field} ${summarize(prev)} -> removed`);
      }
      continue;
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      record[field] = next;
      diffs.push(`${field} ${summarize(prev)} -> ${summarize(next)}`);
    }
  }
  return diffs;
}

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

async function pushKv(dryRun) {
  loadEnvLocal();
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error("Missing Upstash REST credentials (KV_REST_API_URL + KV_REST_API_TOKEN).");
    process.exit(1);
  }
  const redis = new Redis({ url, token });
  const writes = {};
  for (const slug of SLUGS) {
    const key = `CATEGORY#Entity|PROTOCOL#${slug}`;
    const raw = await redis.hget(STORE_KEY, key);
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record || typeof record !== "object") {
      console.warn(`SKIP ${slug}: no record at ${key}`);
      continue;
    }
    const diffs = applyCoverage(record, slug);
    if (diffs.length) {
      record.UpdatedAt = new Date().toISOString();
      writes[key] = JSON.stringify(record);
      console.log(`${slug}:`);
      for (const d of diffs) console.log(`  ${d}`);
    } else {
      console.log(`${slug}: no changes`);
    }
  }
  const n = Object.keys(writes).length;
  if (n === 0) return console.log("Nothing to write.");
  if (dryRun) return console.log(`\n[dry-run] would HSET ${n} key(s). No write performed.`);
  await redis.hset(STORE_KEY, writes);
  console.log(`\nWrote ${n} patched item(s) into "${STORE_KEY}".`);
}

function patchLocalFile(filePath) {
  if (!existsSync(filePath)) return console.warn(`SKIP missing ${filePath}`);
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const items = data.items ?? data;
  let changed = 0;
  for (const slug of SLUGS) {
    const record = items[`CATEGORY#Entity|PROTOCOL#${slug}`];
    if (!record || typeof record !== "object") continue;
    const diffs = applyCoverage(record, slug);
    if (diffs.length) {
      record.UpdatedAt = new Date().toISOString();
      changed++;
    }
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${path.relative(repoRoot, filePath)}: asset coverage patched on ${changed} item(s)`);
}

const mode = process.argv[2];
if (mode === "--local") {
  patchLocalFile(path.join(frontendRoot, "data", "bootstrap-store.json"));
  patchLocalFile(path.join(repoRoot, "backend", "data", "store.json"));
} else {
  await pushKv(process.env.PATCH_DRY_RUN === "1");
}
