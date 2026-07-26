#!/usr/bin/env node
/**
 * Surgical Upstash patch for the 2026-07-26 networks-list fixes:
 *   - aave / morpho `Website` -> canonical sites (app deep-links were
 *     Arbitrum-era artifacts)
 *   - apw Token item -> SPECTRA (ex-APW, 1:1 APWine migration)
 *
 * Reads the live item, patches ONLY those fields, writes it back — live cron
 * metrics and everything else stay untouched. Same pattern as
 * push-member-coins.mjs.
 *
 * Usage:
 *   node frontend/scripts/push-list-fixes.mjs            (writes)
 *   PATCH_DRY_RUN=1 node frontend/scripts/push-list-fixes.mjs   (report only)
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

/** field -> new value, keyed by store hash field. */
const PATCHES = [
  {
    field: "CATEGORY#Entity|PROTOCOL#aave",
    apply: (it) => {
      if (it.Website === "https://aave.com") return null;
      return { ...it, Website: "https://aave.com" };
    },
    label: "aave.Website -> https://aave.com",
  },
  {
    field: "CATEGORY#Entity|PROTOCOL#morpho",
    apply: (it) => {
      if (it.Website === "https://morpho.org") return null;
      return { ...it, Website: "https://morpho.org" };
    },
    label: "morpho.Website -> https://morpho.org",
  },
  {
    field: "CATEGORY#Token|PROTOCOL#apw",
    apply: (it) => {
      if (it.Symbol === "SPECTRA") return null;
      return {
        ...it,
        Symbol: "SPECTRA",
        Name: "Spectra",
        Description:
          "SPECTRA (ex-APW, 1:1 APWine migration) — tracked via compiled coin integration.",
      };
    },
    label: "apw item -> SPECTRA / Spectra",
  },
];

let changed = 0;
const toWrite = {};
for (const p of PATCHES) {
  const raw = await redis.hget(STORE_KEY, p.field);
  if (raw == null) {
    console.log(`SKIP (missing in store): ${p.field}`);
    continue;
  }
  const it = typeof raw === "string" ? JSON.parse(raw) : raw;
  const next = p.apply(it);
  if (next == null) {
    console.log(`OK (already patched): ${p.label}`);
    continue;
  }
  next.UpdatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  toWrite[p.field] = JSON.stringify(next);
  changed += 1;
  console.log(`PATCH: ${p.label}`);
}

if (changed === 0) {
  console.log("Nothing to write.");
} else if (dryRun) {
  console.log(`\n[dry-run] would HSET ${changed} key(s). No write performed.`);
} else {
  await redis.hset(STORE_KEY, toWrite);
  console.log(`\nWrote ${changed} patched item(s) into "${STORE_KEY}".`);
}
