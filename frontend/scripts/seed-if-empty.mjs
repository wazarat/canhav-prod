#!/usr/bin/env node
/**
 * Bootstrap / sync the Upstash research store from the committed bundle.
 *
 * Runs during Vercel production builds where KV_REST_* integration vars are
 * injected. Uses `frontend/data/bootstrap-store.json` (committed seed bundle)
 * because Vercel Root Directory is `frontend` and backend ingest scripts are
 * not in the deployment bundle. Also loads `frontend/.env.local` so it can be
 * run locally to sync new entities into the live store.
 *
 * Behaviour:
 *   - Empty hash         -> full seed from the bootstrap bundle.
 *   - Non-empty hash     -> non-destructive merge: HSET only bootstrap keys
 *                           that are missing from Redis, so newly-added
 *                           entities propagate on every deploy without
 *                           clobbering live cron-written metrics.
 *   - SEED_FORCE=1       -> destructive full re-seed (DEL + seed).
 *
 * Usage:
 *   node scripts/seed-if-empty.mjs               # seed/merge from bootstrap
 *   SEED_FORCE=1 node scripts/seed-if-empty.mjs  # destructive full re-seed
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const bootstrapPath = path.join(frontendRoot, "data", "bootstrap-store.json");
const localStorePath = path.join(repoRoot, "backend", "data", "store.json");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

/** Canonical Credit → Lending entities — taxonomy fields are patched on every deploy. */
const CANONICAL_LENDING_SLUGS = new Set(["aave", "compound", "morpho", "spark", "radiant"]);
const TAXONOMY_PATCH_FIELDS = [
  "Sector",
  "SubSector",
  "Tags",
  "SecondarySectors",
  "StablecoinSubSector",
  "StablecoinSecondaryTags",
];

function parseStoreItem(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === "object" ? raw : null;
}

function taxonomyPatchNeeded(existing, bootstrap) {
  for (const key of TAXONOMY_PATCH_FIELDS) {
    if (JSON.stringify(existing[key]) !== JSON.stringify(bootstrap[key])) return true;
  }
  return false;
}

function applyTaxonomyPatch(existing, bootstrap) {
  const next = { ...existing };
  for (const key of TAXONOMY_PATCH_FIELDS) {
    next[key] = bootstrap[key];
  }
  return next;
}

/** Load `frontend/.env.local` when running outside Next (e.g. local sync). */
function loadEnvLocal() {
  const envPath = path.join(frontendRoot, ".env.local");
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

function log(msg) {
  console.log(`[seed-if-empty] ${msg}`);
}

if (!url || !token) {
  log("No Upstash REST credentials — skipping bootstrap (offline dev).");
  process.exit(0);
}

const force = process.env.SEED_FORCE === "1";

const redis = new Redis({ url, token });

let existingRaw = {};
let existingKeys = new Set();
try {
  existingRaw = (await redis.hgetall(STORE_KEY)) ?? {};
  existingKeys = new Set(Object.keys(existingRaw));
} catch (err) {
  log(`Could not read Redis hash: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
const existingCount = existingKeys.size;

function loadStoreItems() {
  if (existsSync(bootstrapPath)) {
    log(`Loading ${bootstrapPath}`);
    const parsed = JSON.parse(readFileSync(bootstrapPath, "utf-8"));
    return Object.values(parsed.items ?? {});
  }

  const ingestScripts = [
    "ingest_entities.py",
    "ingest_stablecoins.py",
    "ingest_tokens.py",
    "ingest_rwas.py",
  ];

  for (const script of ingestScripts) {
    const scriptPath = path.join(repoRoot, "backend", "scripts", script);
    if (!existsSync(scriptPath)) {
      console.error(`[seed-if-empty] Missing ${scriptPath} and no bootstrap-store.json`);
      process.exit(1);
    }
    log(`Running ${script} …`);
    const result = spawnSync("python3", [scriptPath], {
      cwd: path.join(repoRoot, "backend"),
      stdio: "inherit",
      env: { ...process.env, DB_BACKEND: "local" },
    });
    if (result.status !== 0) {
      console.error(`[seed-if-empty] ${script} failed with exit ${result.status}`);
      process.exit(result.status ?? 1);
    }
  }

  if (!existsSync(localStorePath)) {
    console.error(`[seed-if-empty] Expected ${localStorePath} after ingest — not found.`);
    process.exit(1);
  }

  log(`Loading ${localStorePath}`);
  const parsed = JSON.parse(readFileSync(localStorePath, "utf-8"));
  return Object.values(parsed.items ?? {});
}

let items;
try {
  items = loadStoreItems();
} catch (err) {
  console.error(`[seed-if-empty] Could not load store: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

if (items.length === 0) {
  console.error("[seed-if-empty] No items to seed.");
  process.exit(1);
}

const payload = {};
for (const item of items) {
  const pk = item?.PK;
  const sk = item?.SK;
  if (!pk || !sk) continue;
  payload[`${pk}|${sk}`] = JSON.stringify({ ...item, Status: "APPROVED" });
}

let toWrite;
if (existingCount === 0) {
  log("Store is empty — full seed from bootstrap bundle.");
  toWrite = payload;
} else if (force) {
  await redis.del(STORE_KEY);
  log("SEED_FORCE=1 — cleared hash; full re-seed from bootstrap bundle.");
  toWrite = payload;
} else {
  // Non-destructive merge: add missing bootstrap keys and patch canonical lending taxonomy.
  toWrite = {};
  for (const [field, value] of Object.entries(payload)) {
    if (!existingKeys.has(field)) {
      toWrite[field] = value;
      continue;
    }

    const bootstrapItem = JSON.parse(value);
    if (!CANONICAL_LENDING_SLUGS.has(bootstrapItem?.Slug)) continue;

    const existingItem = parseStoreItem(existingRaw[field]);
    if (!existingItem) continue;
    if (!taxonomyPatchNeeded(existingItem, bootstrapItem)) continue;

    toWrite[field] = JSON.stringify(applyTaxonomyPatch(existingItem, bootstrapItem));
  }

  const addedCount = Object.keys(toWrite).filter((field) => !existingKeys.has(field)).length;
  const patchedCount = Object.keys(toWrite).length - addedCount;
  if (Object.keys(toWrite).length === 0) {
    log(`Store has ${existingCount} items; no new keys or taxonomy patches needed.`);
    process.exit(0);
  }
  log(
    `Store has ${existingCount} items; adding ${addedCount} new key(s), patching ${patchedCount} canonical lending record(s).`,
  );
}

await redis.hset(STORE_KEY, toWrite);

const byCategory = items.reduce((acc, it) => {
  const c = it?.Category ?? "unknown";
  acc[c] = (acc[c] ?? 0) + 1;
  return acc;
}, {});

log(`Wrote ${Object.keys(toWrite).length} item(s) into "${STORE_KEY}".`);
log(`Bootstrap bundle by category: ${JSON.stringify(byCategory)}`);
