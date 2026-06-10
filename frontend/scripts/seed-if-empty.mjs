#!/usr/bin/env node
/**
 * Bootstrap the Upstash research store when the hash is empty.
 *
 * Runs during Vercel production builds where KV_REST_* integration vars are
 * injected. Uses `frontend/data/bootstrap-store.json` (committed seed bundle)
 * because Vercel Root Directory is `frontend` and backend ingest scripts are
 * not in the deployment bundle.
 *
 * Usage:
 *   node scripts/seed-if-empty.mjs          # seed only if Redis hash is empty
 *   SEED_FORCE=1 node scripts/seed-if-empty.mjs  # always re-seed from bootstrap
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
const onVercel = process.env.VERCEL === "1";

if (!onVercel && !force) {
  log("Not on Vercel and SEED_FORCE unset — skipping bootstrap.");
  process.exit(0);
}

const redis = new Redis({ url, token });

let existingCount = 0;
try {
  const raw = await redis.hgetall(STORE_KEY);
  existingCount = raw ? Object.keys(raw).length : 0;
} catch (err) {
  log(`Could not read Redis hash: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}

if (existingCount > 0 && !force) {
  log(`Store already has ${existingCount} items — skipping bootstrap.`);
  process.exit(0);
}

log(
  existingCount === 0
    ? "Store is empty — seeding Upstash from bootstrap bundle."
    : "SEED_FORCE=1 — re-seeding Upstash from bootstrap bundle.",
);

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

if (force && existingCount > 0) {
  await redis.del(STORE_KEY);
  log("Cleared existing hash (SEED_FORCE).");
}

const payload = {};
for (const item of items) {
  const pk = item?.PK;
  const sk = item?.SK;
  if (!pk || !sk) continue;
  payload[`${pk}|${sk}`] = JSON.stringify({ ...item, Status: "APPROVED" });
}

await redis.hset(STORE_KEY, payload);

const byCategory = items.reduce((acc, it) => {
  const c = it?.Category ?? "unknown";
  acc[c] = (acc[c] ?? 0) + 1;
  return acc;
}, {});

log(`Seeded ${Object.keys(payload).length} items into "${STORE_KEY}".`);
log(`By category: ${JSON.stringify(byCategory)}`);
