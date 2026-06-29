#!/usr/bin/env node
/**
 * Non-destructive merge of curated store fields from bootstrap into Redis.
 *
 * Patches empty/null editorial fields (Research, Risks, Partnerships, logos,
 * lending asset coverage) without overwriting cron live metrics
 * (UniversalMetrics, CurrentScale live values, Lending APY/TVL, etc.).
 *
 * Usage:
 *   node scripts/patch-store-content.mjs
 *   PATCH_DRY_RUN=1 node scripts/patch-store-content.mjs
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Redis } from "@upstash/redis";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const bootstrapPath = path.join(frontendRoot, "data", "bootstrap-store.json");
const localStorePath = path.join(repoRoot, "backend", "data", "store.json");
const STORE_KEY = process.env.REDIS_STORE_KEY || "canhav:store";

const LIVE_LENDING_KEYS = new Set([
  "tvlUsd",
  "totalBorrowsUsd",
  "utilizationPct",
  "supplyApyPct",
  "borrowApyPct",
  "netInterestMarginPct",
  "revenue30dUsd",
  "fees30dUsd",
  "revenueAnnualizedUsd",
  "feesAnnualizedUsd",
  "activeUsers",
  "uniqueBorrowers30d",
]);

const LIVE_CREDIT_TAG_METRICS_KEYS = new Set([
  "totalSuppliedUsd",
  "totalBorrowsUsd",
  "utilizationPct",
  "supplyApyPct",
  "borrowApyPct",
  "tvlUsd",
]);

const MERGE_ARRAY_FIELDS = [
  "Components",
  "Faq",
  "Events",
  "Timeline",
  "OrgStructure",
  "InvestmentRounds",
  "TradFiComparison",
  "OffchainFacts",
  "Risks",
  "Partnerships",
  "Competitors",
];

const MERGE_IF_NULL_FIELDS = [
  "Tokenomics",
  "TypedRisks",
  "Description",
  "Differentiator",
  "Tagline",
  "LongDescription",
  "Sources",
  "Lending",
  "CreditTagMetrics",
  "StakingTagMetrics",
  "LiquidityTagMetrics",
  "DerivativesTagMetrics",
  "OtherTagMetrics",
  "RwaTagMetrics",
];

/** Perp DEX venues whose taxonomy is canonical in bootstrap. */
const CANONICAL_PERP_DEX_SLUGS = new Set([
  "gmx",
  "gains-network",
  "dydx",
  "hyperliquid",
  "drift-protocol",
]);

/** Full derivatives taxonomy sync for canonical Perp DEX venues. */
const PERP_DEX_TAXONOMY_FIELDS = [
  "Sector",
  "SubSector",
  "Tags",
  "SecondarySectors",
  "DerivativesSubSector",
  "DerivativesSecondaryTags",
  "DexSubSector",
  "DexSecondaryTags",
  "LiquiditySubSector",
  "LiquiditySecondaryTags",
];

function mergePerpDexTaxonomy(existing, bootstrap) {
  if (!CANONICAL_PERP_DEX_SLUGS.has(bootstrap?.Slug)) return null;
  const next = { ...existing };
  let changed = false;
  for (const key of PERP_DEX_TAXONOMY_FIELDS) {
    if (JSON.stringify(existing[key]) !== JSON.stringify(bootstrap[key])) {
      next[key] = bootstrap[key];
      changed = true;
    }
  }
  return changed ? next : null;
}

function isEmptyArray(value) {
  return !Array.isArray(value) || value.length === 0;
}

function isNullish(value) {
  return value == null;
}

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

function mergePortalMetadata(existing, bootstrap) {
  if (!bootstrap) return existing;
  const ep = existing ?? {};
  const bp = bootstrap;
  const merged = { ...ep };
  let changed = false;

  for (const key of ["logoUrl", "bannerUrl", "portalUrl", "foundedDate"]) {
    if (!ep[key] && bp[key]) {
      merged[key] = bp[key];
      changed = true;
    }
  }
  if (isEmptyArray(ep.chains) && !isEmptyArray(bp.chains)) {
    merged.chains = bp.chains;
    changed = true;
  }

  return changed ? merged : null;
}

function mergeLendingCurated(existing, bootstrap) {
  if (!bootstrap) return null;
  if (!existing) return bootstrap;

  const merged = { ...existing };
  let changed = false;

  for (const [key, value] of Object.entries(bootstrap)) {
    if (LIVE_LENDING_KEYS.has(key)) continue;
    const cur = existing[key];
    if (cur == null || (Array.isArray(cur) && cur.length === 0)) {
      if (value != null && !(Array.isArray(value) && value.length === 0)) {
        merged[key] = value;
        changed = true;
      }
    }
  }

  return changed ? merged : null;
}

function mergeCreditTagMetricsCurated(existing, bootstrap) {
  if (!bootstrap) return null;
  if (!existing) return bootstrap;

  const merged = { ...existing };
  let changed = false;

  for (const [tagKey, tagBlock] of Object.entries(bootstrap)) {
    if (!tagBlock || typeof tagBlock !== "object") continue;
    const curBlock = existing[tagKey] ?? {};
    const nextBlock = { ...curBlock };
    let blockChanged = false;

    for (const [field, value] of Object.entries(tagBlock)) {
      if (LIVE_CREDIT_TAG_METRICS_KEYS.has(field)) continue;
      const cur = curBlock[field];
      if (cur == null || (Array.isArray(cur) && cur.length === 0)) {
        if (value != null && !(Array.isArray(value) && value.length === 0)) {
          nextBlock[field] = value;
          blockChanged = true;
        }
      }
    }

    if (blockChanged) {
      merged[tagKey] = nextBlock;
      changed = true;
    }
  }

  return changed ? merged : null;
}

/** Merge bootstrap curated fields into existing when existing is empty. Never touches live cron fields. */
export function mergeCuratedContent(existing, bootstrap) {
  if (!existing || !bootstrap) return null;

  const next = { ...existing };
  let changed = false;

  for (const key of MERGE_ARRAY_FIELDS) {
    if (isEmptyArray(existing[key]) && !isEmptyArray(bootstrap[key])) {
      next[key] = bootstrap[key];
      changed = true;
    }
  }

  for (const key of MERGE_IF_NULL_FIELDS) {
    if (key === "Lending") continue;
    if (key === "CreditTagMetrics") continue;
    if (isNullish(existing[key]) && !isNullish(bootstrap[key])) {
      next[key] = bootstrap[key];
      changed = true;
    }
  }

  const portal = mergePortalMetadata(existing.ArbitrumPortalMetadata, bootstrap.ArbitrumPortalMetadata);
  if (portal) {
    next.ArbitrumPortalMetadata = portal;
    changed = true;
  }

  const lending = mergeLendingCurated(existing.Lending, bootstrap.Lending);
  if (lending) {
    next.Lending = lending;
    changed = true;
  }

  const ctm = mergeCreditTagMetricsCurated(existing.CreditTagMetrics, bootstrap.CreditTagMetrics);
  if (ctm) {
    next.CreditTagMetrics = ctm;
    changed = true;
  }

  const perpDex = mergePerpDexTaxonomy(existing, bootstrap);
  if (perpDex) {
    Object.assign(next, perpDex);
    changed = true;
  }

  return changed ? next : null;
}

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

function log(msg) {
  console.log(`[patch-store-content] ${msg}`);
}

async function patchRedis() {
  loadEnvLocal();
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  const dryRun = process.env.PATCH_DRY_RUN === "1";

  if (!url || !token) {
    log("No Upstash credentials — skipping Redis patch.");
    return { patched: 0 };
  }

  const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf-8"));
  const bootstrapByKey = bootstrap.items ?? {};

  const redis = new Redis({ url, token });
  const existingRaw = (await redis.hgetall(STORE_KEY)) ?? {};

  const toWrite = {};
  let patched = 0;

  for (const [field, raw] of Object.entries(existingRaw)) {
    const bootstrapItem = bootstrapByKey[field];
    if (!bootstrapItem) continue;

    const existingItem = parseStoreItem(raw);
    if (!existingItem) continue;

    const merged = mergeCuratedContent(existingItem, bootstrapItem);
    if (!merged) continue;

    toWrite[field] = JSON.stringify(merged);
    patched += 1;
  }

  if (patched === 0) {
    log("No curated content patches needed.");
    return { patched: 0 };
  }

  if (dryRun) {
    log(`DRY RUN: would patch ${patched} item(s).`);
    return { patched };
  }

  await redis.hset(STORE_KEY, toWrite);
  log(`Patched ${patched} item(s) in "${STORE_KEY}".`);
  return { patched };
}

function patchLocalStore() {
  if (!existsSync(localStorePath) || !existsSync(bootstrapPath)) return 0;

  const store = JSON.parse(readFileSync(localStorePath, "utf-8"));
  const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf-8"));
  const items = store.items ?? {};
  const bootstrapByKey = bootstrap.items ?? {};
  let patched = 0;

  for (const [field, existingItem] of Object.entries(items)) {
    const bootstrapItem = bootstrapByKey[field];
    if (!bootstrapItem) continue;
    const merged = mergeCuratedContent(existingItem, bootstrapItem);
    if (!merged) continue;
    items[field] = merged;
    patched += 1;
  }

  if (patched > 0) {
    store.items = items;
    store._meta = {
      ...(store._meta ?? {}),
      updatedAt: new Date().toISOString(),
      contentPatch: patched,
    };
    writeFileSync(localStorePath, `${JSON.stringify(store, null, 2)}\n`);
    log(`Patched ${patched} item(s) in ${localStorePath}.`);
  }

  return patched;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isMain) {
  patchLocalStore();
  patchRedis()
    .then(({ patched }) => {
      if (patched === 0 && !existsSync(localStorePath)) {
        log("Done.");
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
