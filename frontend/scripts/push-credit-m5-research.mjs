#!/usr/bin/env node
/**
 * Credit M5 Research content load (Credits completion, milestone M5 / CAN-67).
 *
 * REPLACE-PER-FIELD (user-approved 2026-07-26): for exactly the 14 tagged
 * Credit entities, the M5 dataset supersedes existing content on each mapped
 * field. The 8 parked Credit entities (M11) are never touched. No other field
 * is written. Sources:
 *   - scripts/data/credit-m5-research.json  (parse-credit-m5-research.mjs)
 *       LongDescription, OffchainFacts, TradFiAnalogue, TradFiComparison,
 *       OrgIntro, OrgStructure, InvestmentRounds, FundingNote, Timeline, Faq,
 *       BullBearCase, ResearchPublications
 *   - scripts/data/credit-m6m7-dataset.json (parse-credit-m6m7-risks.mjs)
 *       TypedRisks (real M7 risk rows; feeds RiskScoreChip + Risks tab)
 * Plus: Events -> [] (Timeline supersedes; retires 21 entities' dead Events
 * arrays) and an UpdatedAt bump.
 *
 * Modes (same contract as push-credit-m0.mjs):
 *   node scripts/push-credit-m5-research.mjs --local   # patch bootstrap-store.json + backend/data/store.json
 *   PATCH_DRY_RUN=1 node scripts/push-credit-m5-research.mjs   # per-field diff report, no write
 *   node scripts/push-credit-m5-research.mjs           # apply to Upstash KV
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const research = JSON.parse(
  readFileSync(path.join(here, "data", "credit-m5-research.json"), "utf-8"),
);
const riskDataset = JSON.parse(
  readFileSync(path.join(here, "data", "credit-m6m7-dataset.json"), "utf-8"),
);

const SLUGS = Object.keys(research.content).sort();
if (SLUGS.length !== 14) {
  console.error(`Expected 14 slugs in the research sidecar, found ${SLUGS.length}.`);
  process.exit(1);
}
for (const slug of SLUGS) {
  if (!riskDataset.entities[slug]) {
    console.error(`No TypedRisks for ${slug} in the M6/M7 sidecar.`);
    process.exit(1);
  }
}

/** The only fields this script may write (replace policy), besides Events/UpdatedAt. */
const FIELDS = [
  "LongDescription",
  "OffchainFacts",
  "TradFiAnalogue",
  "TradFiComparison",
  "OrgIntro",
  "OrgStructure",
  "InvestmentRounds",
  "FundingNote",
  "Timeline",
  "Faq",
  "BullBearCase",
  "ResearchPublications",
  "TypedRisks",
];

function newValueFor(slug, field) {
  if (field === "TypedRisks") return riskDataset.entities[slug].TypedRisks;
  return research.content[slug][field] ?? null;
}

function summarize(value) {
  if (value == null) return "-";
  if (Array.isArray(value)) return `${value.length} rows`;
  if (typeof value === "string") return `${value.length} chars`;
  if (typeof value === "object" && value.bull) {
    return `bull ${value.bull.length}/bear ${value.bear.length}`;
  }
  return typeof value;
}

const isEmpty = (v) =>
  v == null || (Array.isArray(v) && v.length === 0) || (typeof v === "string" && !v.trim());

/** Mutates record; returns diff lines for the report. */
function applyResearch(record, slug) {
  const diffs = [];
  for (const field of FIELDS) {
    const next = newValueFor(slug, field);
    const prev = record[field];
    const before = summarize(prev);
    const after = summarize(next);
    if (isEmpty(next)) {
      // Replace policy still never stores empties: drop the stale field instead.
      if (!isEmpty(prev)) {
        delete record[field];
        diffs.push(`${field} ${before} -> removed`);
      }
      continue;
    }
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      record[field] = next;
      diffs.push(`${field} ${before} -> ${after}`);
    }
  }
  const events = Array.isArray(record.Events) ? record.Events.length : 0;
  if (events > 0) {
    record.Events = [];
    diffs.push(`Events ${events} rows -> 0 (Timeline supersedes)`);
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
    const diffs = applyResearch(record, slug);
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
    const diffs = applyResearch(record, slug);
    if (diffs.length) {
      record.UpdatedAt = new Date().toISOString();
      changed++;
    }
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${path.relative(repoRoot, filePath)}: research content replaced on ${changed} item(s)`);
}

const mode = process.argv[2];
if (mode === "--local") {
  patchLocalFile(path.join(frontendRoot, "data", "bootstrap-store.json"));
  patchLocalFile(path.join(repoRoot, "backend", "data", "store.json"));
} else {
  await pushKv(process.env.PATCH_DRY_RUN === "1");
}
