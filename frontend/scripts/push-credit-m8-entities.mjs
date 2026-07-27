#!/usr/bin/env node
/**
 * Credit M8 entity ingest (Credits completion CAN-84 / M8.1).
 *
 * Writes, and nothing else:
 *  - 15 NEW entity records (CATEGORY#Entity|PROTOCOL#<slug>) from the parsed
 *    sidecar. If a record already exists (re-run, or cron got there first),
 *    sidecar-owned fields are merged OVER it so cron-written fields
 *    (UniversalMetrics, Market, ...) survive.
 *  - 3 MIGRATIONS (liquity, curve-stablecoin, inverse-finance): ONLY Sector,
 *    SubSector, Tags, SecondarySectors. lista-dao is deliberately untouched
 *    (parked to M11 by user decision 2026-07-27).
 *  - maple: Tags PURE UNION to ["Lending","Fixed Income"] (KV already has it;
 *    this reconciles the local bootstrap. Union only — the M4 dry-run once
 *    caught a replace stripping maple's live tag).
 *
 * Source sidecar: scripts/data/credit-m8-store-patch.json
 * (parse-credit-m8-competitors.mjs; fidelity gates live there).
 *
 * Modes (same contract as push-credit-m7-risk-posture.mjs):
 *   node scripts/push-credit-m8-entities.mjs --local
 *   PATCH_DRY_RUN=1 node scripts/push-credit-m8-entities.mjs
 *   node scripts/push-credit-m8-entities.mjs            # live (user-run)
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

const NEW_SLUGS = Object.keys(sidecar.newEntities).sort();
const MIGRATED = Object.keys(sidecar.migrations).sort();
if (NEW_SLUGS.length !== 15) {
  console.error(`Expected 15 new entities in the M8 sidecar, found ${NEW_SLUGS.length}.`);
  process.exit(1);
}
if (MIGRATED.length !== 3 || MIGRATED.includes("lista-dao")) {
  console.error(`Expected exactly 3 migrations without lista-dao, found: ${MIGRATED.join(", ")}.`);
  process.exit(1);
}
for (const slug of NEW_SLUGS) {
  const rec = sidecar.newEntities[slug];
  if (rec.Sector !== "Credit" || !Array.isArray(rec.Tags) || rec.Tags.length !== 1) {
    console.error(`${slug}: implausible sidecar record (Sector/Tags) — refusing to push.`);
    process.exit(1);
  }
  if (!rec.Description || rec.Description.length < 200) {
    console.error(`${slug}: Description missing or implausibly short — refusing to push.`);
    process.exit(1);
  }
}

/** Merge the sidecar record over an existing one (or create). Returns diff lines. */
function applyNewEntity(existing, slug) {
  const fresh = sidecar.newEntities[slug];
  if (!existing) return { record: { ...fresh }, diffs: ["CREATE (full record)"] };
  const record = { ...existing };
  const diffs = [];
  for (const [k, v] of Object.entries(fresh)) {
    if (k === "CreatedAt" || k === "UpdatedAt") continue;
    if (JSON.stringify(record[k]) !== JSON.stringify(v)) {
      diffs.push(`${k} replaced`);
      record[k] = v;
    }
  }
  return { record, diffs };
}

const MIGRATION_FIELDS = ["Sector", "SubSector", "Tags", "SecondarySectors"];

/** Taxonomy-only migration patch. Returns diff lines; mutates record. */
function applyMigration(record, slug) {
  const patch = sidecar.migrations[slug];
  const diffs = [];
  for (const field of MIGRATION_FIELDS) {
    const next = patch[field];
    if (JSON.stringify(record[field]) !== JSON.stringify(next)) {
      diffs.push(`${field} ${JSON.stringify(record[field])} -> ${JSON.stringify(next)}`);
      record[field] = next;
    }
  }
  return diffs;
}

/** maple: pure tag union. Returns diff lines; mutates record. */
function applyMapleUnion(record) {
  const current = Array.isArray(record.Tags) ? record.Tags : [];
  const union = [...current];
  for (const t of sidecar.mapleTagUnion) if (!union.includes(t)) union.push(t);
  if (JSON.stringify(current) === JSON.stringify(union)) return [];
  const diffs = [`Tags ${JSON.stringify(current)} -> ${JSON.stringify(union)} (pure union)`];
  record.Tags = union;
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

  for (const slug of NEW_SLUGS) {
    const key = `CATEGORY#Entity|PROTOCOL#${slug}`;
    const raw = await redis.hget(STORE_KEY, key);
    const existing = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    const { record, diffs } = applyNewEntity(existing, slug);
    if (diffs.length) {
      record.UpdatedAt = new Date().toISOString();
      writes[key] = JSON.stringify(record);
      console.log(`${slug}: ${diffs.join(", ")}`);
    } else {
      console.log(`${slug}: no changes`);
    }
  }

  for (const slug of MIGRATED) {
    const key = `CATEGORY#Entity|PROTOCOL#${slug}`;
    const raw = await redis.hget(STORE_KEY, key);
    const record = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (!record) {
      console.error(`ABORT: migration target ${slug} missing from live KV.`);
      process.exit(1);
    }
    const diffs = applyMigration(record, slug);
    if (diffs.length) {
      record.UpdatedAt = new Date().toISOString();
      writes[key] = JSON.stringify(record);
      console.log(`${slug}:`);
      for (const d of diffs) console.log(`  ${d}`);
    } else {
      console.log(`${slug}: no changes`);
    }
  }

  {
    const key = "CATEGORY#Entity|PROTOCOL#maple";
    const raw = await redis.hget(STORE_KEY, key);
    const record = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (record) {
      const diffs = applyMapleUnion(record);
      if (diffs.length) {
        record.UpdatedAt = new Date().toISOString();
        writes[key] = JSON.stringify(record);
        console.log(`maple: ${diffs.join(", ")}`);
      } else {
        console.log("maple: no changes (KV already has the union)");
      }
    }
  }

  const n = Object.keys(writes).length;
  if (n === 0) return console.log("Nothing to write.");
  if (dryRun) return console.log(`\n[dry-run] would HSET ${n} key(s). No write performed.`);
  await redis.hset(STORE_KEY, writes);
  console.log(`\nWrote ${n} item(s) into "${STORE_KEY}".`);
}

function patchLocalFile(filePath) {
  if (!existsSync(filePath)) return console.warn(`SKIP missing ${filePath}`);
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const items = data.items ?? data;
  let changed = 0;

  for (const slug of NEW_SLUGS) {
    const key = `CATEGORY#Entity|PROTOCOL#${slug}`;
    const { record, diffs } = applyNewEntity(items[key] ?? null, slug);
    if (diffs.length) {
      record.UpdatedAt = new Date().toISOString();
      items[key] = record;
      changed++;
    }
  }
  for (const slug of MIGRATED) {
    const record = items[`CATEGORY#Entity|PROTOCOL#${slug}`];
    if (!record) continue;
    if (applyMigration(record, slug).length) {
      record.UpdatedAt = new Date().toISOString();
      changed++;
    }
  }
  const maple = items["CATEGORY#Entity|PROTOCOL#maple"];
  if (maple && applyMapleUnion(maple).length) {
    maple.UpdatedAt = new Date().toISOString();
    changed++;
  }

  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${path.relative(repoRoot, filePath)}: ${changed} item(s) created/patched`);
}

const mode = process.argv[2];
if (mode === "--local") {
  patchLocalFile(path.join(frontendRoot, "data", "bootstrap-store.json"));
  patchLocalFile(path.join(repoRoot, "backend", "data", "store.json"));
} else {
  await pushKv(process.env.PATCH_DRY_RUN === "1");
}
