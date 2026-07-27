#!/usr/bin/env node
/**
 * Credit M8 competitor reciprocity push (Credits completion CAN-84 / M8.1).
 *
 * APPEND-IF-MISSING on the Competitors field only: for each record in the
 * sidecar's competitorAdditions, append the Competitor rows whose slug the
 * record does not already list (union by slug against the record's CURRENT
 * state, so live-KV rows added since the parse are never clobbered and the
 * script is idempotent). Ranks are recomputed from the record's live row
 * count. Nothing else is touched.
 *
 * MUST run AFTER push-credit-m8-entities.mjs: additions target records that
 * include the migrated entities, and reciprocity peers include the 15 new
 * records. Aborts if a target record is missing.
 *
 * Modes:
 *   node scripts/push-credit-m8-competitors.mjs --local
 *   PATCH_DRY_RUN=1 node scripts/push-credit-m8-competitors.mjs
 *   node scripts/push-credit-m8-competitors.mjs            # live (user-run)
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
  readFileSync(path.join(here, "data", "credit-m8-store-patch.json"), "utf-8"),
);

const additions = sidecar.competitorAdditions;
const SLUGS = Object.keys(additions).sort();
if (SLUGS.length !== sidecar.manifest.competitorAdditionRecords) {
  console.error(
    `Sidecar manifest mismatch: ${SLUGS.length} addition records vs manifest ${sidecar.manifest.competitorAdditionRecords}.`,
  );
  process.exit(1);
}
for (const slug of SLUGS) {
  for (const row of additions[slug]) {
    if (!row.slug || !row.name || !row.similarities) {
      console.error(`${slug}: malformed addition row ${JSON.stringify(row)} — refusing to push.`);
      process.exit(1);
    }
  }
}

/** Mutates record; returns diff lines (appended slugs). */
function applyAdditions(record, slug) {
  const rows = Array.isArray(record.Competitors) ? record.Competitors : [];
  const present = new Set(rows.map((r) => r.slug).filter(Boolean));
  const diffs = [];
  for (const row of additions[slug]) {
    if (present.has(row.slug)) continue;
    rows.push({ ...row, rank: rows.length + 1 });
    present.add(row.slug);
    diffs.push(`+${row.slug}`);
  }
  if (diffs.length) record.Competitors = rows;
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
    const record = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (!record) {
      console.error(`ABORT: ${slug} missing from live KV — run push-credit-m8-entities.mjs first.`);
      process.exit(1);
    }
    const diffs = applyAdditions(record, slug);
    if (diffs.length) {
      record.UpdatedAt = new Date().toISOString();
      writes[key] = JSON.stringify(record);
      console.log(`${slug}: ${diffs.join(" ")}`);
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
    if (!record) {
      console.error(`ABORT: ${slug} missing locally — run push-credit-m8-entities.mjs --local first.`);
      process.exit(1);
    }
    if (applyAdditions(record, slug).length) {
      record.UpdatedAt = new Date().toISOString();
      changed++;
    }
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${path.relative(repoRoot, filePath)}: competitors appended on ${changed} item(s)`);
}

const mode = process.argv[2];
if (mode === "--local") {
  patchLocalFile(path.join(frontendRoot, "data", "bootstrap-store.json"));
  patchLocalFile(path.join(repoRoot, "backend", "data", "store.json"));
} else {
  await pushKv(process.env.PATCH_DRY_RUN === "1");
}
