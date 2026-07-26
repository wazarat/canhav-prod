#!/usr/bin/env node
/**
 * Credit M0 data migration (Credits completion project, milestone M0).
 *
 * Applies, surgically and idempotently, to the 22 Credit-filter entities:
 *   1. Em dash cleanup (scripts/data/credit-m0-emdash-patch.json): exact
 *      old→new string replacements, path-verified per record. A record string
 *      that no longer equals `old` is reported and skipped, never guessed.
 *   2. Editorial content (scripts/data/credit-m0-content.json, optional):
 *      per-slug `LongDescription` (set only when currently empty) and
 *      `CurrentScale` sub-fields (fill-only: never overwrites a non-null
 *      live value).
 *
 * Modes:
 *   node scripts/push-credit-m0.mjs --local           # patch bootstrap-store.json + backend/data/store.json
 *   PATCH_DRY_RUN=1 node scripts/push-credit-m0.mjs   # report KV changes only
 *   node scripts/push-credit-m0.mjs                   # apply to Upstash KV
 *
 * Credentials: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_* variants),
 * auto-loaded from frontend/.env.local like the sibling push scripts.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const emdashPatches = JSON.parse(
  readFileSync(path.join(here, "data", "credit-m0-emdash-patch.json"), "utf-8"),
);
const contentPath = path.join(here, "data", "credit-m0-content.json");
const content = existsSync(contentPath) ? JSON.parse(readFileSync(contentPath, "utf-8")) : {};

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

/** Split ".Risks[0].description" into ["Risks", 0, "description"]. */
function pathTokens(p) {
  return p
    .split(".")
    .filter(Boolean)
    .flatMap((seg) => {
      const out = [];
      for (const m of seg.matchAll(/([^[\]]+)|\[(\d+)\]/g)) {
        if (m[1] !== undefined) out.push(m[1]);
        else out.push(Number(m[2]));
      }
      return out;
    });
}

/** Returns {applied, mismatched} counts; mutates record in place. */
function applyEmdashPatches(record, patches, label) {
  let applied = 0;
  let mismatched = 0;
  for (const p of patches) {
    const tokens = pathTokens(p.path);
    let parent = record;
    for (let i = 0; i < tokens.length - 1 && parent != null; i++) parent = parent[tokens[i]];
    const leaf = tokens[tokens.length - 1];
    if (parent == null || typeof parent[leaf] !== "string") {
      console.warn(`  MISSING ${label} ${p.slug}${p.path}`);
      mismatched++;
      continue;
    }
    if (parent[leaf] === p.new) continue; // already migrated
    if (parent[leaf] !== p.old) {
      console.warn(`  DRIFT ${label} ${p.slug}${p.path} (live text != expected old text; skipped)`);
      mismatched++;
      continue;
    }
    parent[leaf] = p.new;
    applied++;
  }
  return { applied, mismatched };
}

/** Fill-only merge of content entry into record. Returns true if changed. */
function applyContent(record, entry) {
  let changed = false;
  if (entry.LongDescription && !(typeof record.LongDescription === "string" && record.LongDescription.trim())) {
    record.LongDescription = entry.LongDescription;
    changed = true;
  }
  if (entry.CurrentScale && typeof entry.CurrentScale === "object") {
    const cs = record.CurrentScale && typeof record.CurrentScale === "object" ? record.CurrentScale : {};
    for (const [k, v] of Object.entries(entry.CurrentScale)) {
      if (cs[k] == null && v != null) {
        cs[k] = v;
        changed = true;
      }
    }
    if (changed) record.CurrentScale = cs;
  }
  return changed;
}

const bySlug = new Map();
for (const p of emdashPatches) {
  if (!bySlug.has(p.slug)) bySlug.set(p.slug, { key: p.key, patches: [] });
  bySlug.get(p.slug).patches.push(p);
}
for (const slug of Object.keys(content)) {
  if (!bySlug.has(slug)) bySlug.set(slug, { key: `CATEGORY#Entity|PROTOCOL#${slug}`, patches: [] });
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
  for (const [slug, { key, patches }] of bySlug) {
    const raw = await redis.hget(STORE_KEY, key);
    const record = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!record || typeof record !== "object") {
      console.warn(`SKIP ${slug}: no record at ${key}`);
      continue;
    }
    const { applied } = applyEmdashPatches(record, patches, "kv");
    const contentChanged = content[slug] ? applyContent(record, content[slug]) : false;
    if (applied > 0 || contentChanged) {
      record.UpdatedAt = new Date().toISOString();
      writes[key] = JSON.stringify(record);
      console.log(`${slug}: ${applied} em dash fix(es)${contentChanged ? " + content" : ""}`);
    }
  }
  const n = Object.keys(writes).length;
  if (n === 0) return console.log("Nothing to write — already migrated.");
  if (dryRun) return console.log(`\n[dry-run] would HSET ${n} key(s). No write performed.`);
  await redis.hset(STORE_KEY, writes);
  console.log(`\nWrote ${n} patched item(s) into "${STORE_KEY}".`);
}

function patchLocalFile(filePath) {
  if (!existsSync(filePath)) return console.warn(`SKIP missing ${filePath}`);
  const data = JSON.parse(readFileSync(filePath, "utf-8"));
  const items = data.items ?? data;
  let totalApplied = 0;
  let contentCount = 0;
  for (const [slug, { key, patches }] of bySlug) {
    const record = items[key];
    if (!record || typeof record !== "object") continue; // store may not carry this entity
    const { applied } = applyEmdashPatches(record, patches, path.basename(filePath));
    const contentChanged = content[slug] ? applyContent(record, content[slug]) : false;
    totalApplied += applied;
    if (contentChanged) contentCount++;
  }
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${path.relative(repoRoot, filePath)}: ${totalApplied} em dash fix(es), content on ${contentCount} item(s)`);
}

const mode = process.argv[2];
if (mode === "--local") {
  patchLocalFile(path.join(frontendRoot, "data", "bootstrap-store.json"));
  patchLocalFile(path.join(repoRoot, "backend", "data", "store.json"));
} else {
  await pushKv(process.env.PATCH_DRY_RUN === "1");
}
