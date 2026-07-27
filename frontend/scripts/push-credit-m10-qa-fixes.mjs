#!/usr/bin/env node
/**
 * M10 (CAN-80 sweeps): the QA-found live-store fixes.
 *  - 15 prose em dashes: 13 identical AssetCoverage.curatedNote sentences
 *    (authored by the M6 push script, slipped its gates) and 2 M8-migration
 *    Differentiators (liquity, inverse-finance). Pure text substitutions.
 *  - compound Tokenomics.maxSupply is the prose string "10,000,000 COMP" in a
 *    number-typed field; formatNumberCompact crashed on it and prod
 *    /networks/compound?tab=research has 500'd since the M5 push. Set the
 *    numeric value (the render layer adds compact formatting; the COMP unit
 *    is implied by the tokenomics card context).
 *
 * Usage:
 *   PATCH_DRY_RUN=1 node scripts/push-credit-m10-qa-fixes.mjs   # dry-run vs live KV
 *   node scripts/push-credit-m10-qa-fixes.mjs --local           # patch bootstrap only
 *   node scripts/push-credit-m10-qa-fixes.mjs --live            # live write (user-run)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";
const args = process.argv.slice(2);
const LOCAL = args.includes("--local");
const LIVE = args.includes("--live");
const DRY = process.env.PATCH_DRY_RUN === "1" || (!LOCAL && !LIVE);

const CURATED_OLD =
  "Curated list ranked by size and strategic importance — not the exhaustive on-chain asset universe.";
const CURATED_NEW =
  "Curated list ranked by size and strategic importance; not the exhaustive on-chain asset universe.";

const CURATED_SLUGS = [
  "aave", "compound", "extra-finance", "fluid", "gearbox", "maple", "morpho",
  "notional", "pendle", "radiant", "spark", "spectra", "stella",
];
const DIFFERENTIATOR_FIX = {
  "inverse-finance": {
    from: "DOLA CDP stack plus FiRM fixed-rate borrowing — distinct from Aave-style variable-rate money markets.",
    to: "DOLA CDP stack plus FiRM fixed-rate borrowing; distinct from Aave-style variable-rate money markets.",
  },
  liquity: {
    from: "Fully immutable, governance-minimized CDP — LUSD V1 has zero ongoing interest; BOLD V2 adds user-set rates and wstETH/rETH collateral.",
    to: "Fully immutable, governance-minimized CDP: LUSD V1 has zero ongoing interest; BOLD V2 adds user-set rates and wstETH/rETH collateral.",
  },
};

function patchRecord(slug, record) {
  let changed = false;
  if (CURATED_SLUGS.includes(slug)) {
    const note = record.AssetCoverage?.curatedNote;
    if (note === CURATED_OLD) {
      record.AssetCoverage.curatedNote = CURATED_NEW;
      changed = true;
      console.log(`${slug}: curatedNote patched`);
    } else if (note?.includes("—")) {
      console.warn(`${slug}: curatedNote has an em dash but unexpected text; SKIPPED`);
    } else {
      console.log(`${slug}: curatedNote already clean`);
    }
  }
  if (slug === "compound") {
    const ms = record.Tokenomics?.maxSupply;
    if (ms === "10,000,000 COMP") {
      record.Tokenomics.maxSupply = 10_000_000;
      changed = true;
      console.log("compound: Tokenomics.maxSupply string -> 10000000");
    } else if (typeof ms === "string") {
      console.warn(`compound: Tokenomics.maxSupply unexpected string ${JSON.stringify(ms)}; SKIPPED`);
    } else {
      console.log("compound: Tokenomics.maxSupply already numeric");
    }
  }
  const fix = DIFFERENTIATOR_FIX[slug];
  if (fix) {
    if (record.Differentiator === fix.from) {
      record.Differentiator = fix.to;
      changed = true;
      console.log(`${slug}: Differentiator patched`);
    } else if (record.Differentiator?.includes("—")) {
      console.warn(`${slug}: Differentiator has an em dash but unexpected text; SKIPPED`);
    } else {
      console.log(`${slug}: Differentiator already clean`);
    }
  }
  return changed;
}

const SLUGS = [...new Set([...CURATED_SLUGS, ...Object.keys(DIFFERENTIATOR_FIX)])];

function loadEnvLocal() {
  const envPath = path.join(here, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

if (LOCAL) {
  const file = path.join(here, "..", "data", "bootstrap-store.json");
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  let changed = 0;
  for (const slug of SLUGS) {
    const rec = data.items[`CATEGORY#Entity|PROTOCOL#${slug}`];
    if (!rec) {
      console.error(`ABORT: ${slug} missing locally.`);
      process.exit(1);
    }
    if (patchRecord(slug, rec)) {
      rec.UpdatedAt = new Date().toISOString();
      changed += 1;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  console.log(`\nPatched ${changed} record(s) in bootstrap-store.json`);
} else {
  loadEnvLocal();
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error("Missing Upstash REST credentials.");
    process.exit(1);
  }
  const redis = new Redis({ url, token });
  const writes = {};
  for (const slug of SLUGS) {
    const key = `CATEGORY#Entity|PROTOCOL#${slug}`;
    const raw = await redis.hget(STORE_KEY, key);
    const record = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (!record) {
      console.error(`ABORT: ${slug} missing from live KV.`);
      process.exit(1);
    }
    if (patchRecord(slug, record)) {
      record.UpdatedAt = new Date().toISOString();
      writes[key] = JSON.stringify(record);
    }
  }
  const n = Object.keys(writes).length;
  if (n === 0) {
    console.log("Nothing to write.");
  } else if (DRY) {
    console.log(`\n[dry-run] would HSET ${n} key(s). No write performed.`);
  } else {
    await redis.hset(STORE_KEY, writes);
    console.log(`\nWrote ${n} patched item(s) into "${STORE_KEY}".`);
  }
}
