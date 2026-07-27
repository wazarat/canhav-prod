#!/usr/bin/env node
/**
 * M8 reciprocity hard gate (CAN-84 definition of done: "Tier A relationships
 * are reciprocal across the whole Credit set, verified by an automated
 * assertion rather than by eye").
 *
 * Asserts over a store snapshot:
 *  1. For every Credit-affiliated entity A and every slugged competitor row B
 *     on A where B is Credit-affiliated: A appears in B's Competitors.
 *  2. No self-listings, no duplicate slugs within one record.
 *  3. The store's Credit edge set EXACTLY equals the sidecar's edges
 *     (creditCompetitorModel.ts is generated from the same sidecar, so the
 *     committed model and the store cannot drift).
 *  4. The boros|pendle edge carries sharedParent in the sidecar.
 *
 * Modes:
 *   node scripts/verify-m8-reciprocity.mjs          # bootstrap + backend store
 *   node scripts/verify-m8-reciprocity.mjs --live   # read-only against live KV
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");

const sidecar = JSON.parse(
  readFileSync(path.join(here, "data", "credit-m8-store-patch.json"), "utf-8"),
);

const TAGGED = new Set(Object.values(sidecar.tagCohorts).flat());
const CREDIT_AFFILIATED = new Set([
  ...TAGGED,
  "justlend", "kamino", "venus", "usd-ai", "sky", "centrifuge", "clearpool", "goldfinch",
]);

const errors = [];

function check(items, label) {
  const rec = (slug) => items[`CATEGORY#Entity|PROTOCOL#${slug}`] ?? null;
  const listings = new Map();
  for (const slug of CREDIT_AFFILIATED) {
    const r = rec(slug);
    if (!r) {
      errors.push(`[${label}] missing record for ${slug}`);
      continue;
    }
    const rows = Array.isArray(r.Competitors) ? r.Competitors : [];
    const seen = new Set();
    const set = new Set();
    for (const row of rows) {
      if (!row.slug) continue;
      if (row.slug === slug) errors.push(`[${label}] ${slug} lists itself`);
      if (seen.has(row.slug)) errors.push(`[${label}] ${slug} lists ${row.slug} twice`);
      seen.add(row.slug);
      if (CREDIT_AFFILIATED.has(row.slug)) set.add(row.slug);
    }
    listings.set(slug, set);
  }

  // 1. Total reciprocity
  for (const [a, peers] of listings) {
    for (const b of peers) {
      if (!listings.get(b)?.has(a)) {
        errors.push(`[${label}] ${a} lists ${b}, but ${b} does not list ${a}`);
      }
    }
  }

  // 3. Edge-set identity with the sidecar / generated model
  const storeEdges = new Set();
  for (const [a, peers] of listings) {
    for (const b of peers) storeEdges.add([a, b].sort().join("|"));
  }
  const modelEdges = new Set(sidecar.edges.map((e) => `${e.a}|${e.b}`));
  for (const e of storeEdges) {
    if (!modelEdges.has(e)) errors.push(`[${label}] store edge ${e} missing from the generated model`);
  }
  for (const e of modelEdges) {
    if (!storeEdges.has(e)) errors.push(`[${label}] model edge ${e} missing from the store`);
  }
  console.log(`[${label}] ${listings.size} records, ${storeEdges.size} credit edges checked`);
}

// 4. sharedParent invariant (model-level)
const bp = sidecar.edges.find((e) => e.a === "boros" && e.b === "pendle");
if (!bp?.sharedParent) errors.push("boros|pendle edge missing sharedParent flag");

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

if (process.argv[2] === "--live") {
  loadEnvLocal();
  const { Redis } = await import("@upstash/redis");
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.error("Missing Upstash REST credentials.");
    process.exit(1);
  }
  const redis = new Redis({ url, token });
  const items = {};
  for (const slug of CREDIT_AFFILIATED) {
    const raw = await redis.hget("canhav:store", `CATEGORY#Entity|PROTOCOL#${slug}`);
    if (raw) items[`CATEGORY#Entity|PROTOCOL#${slug}`] = typeof raw === "string" ? JSON.parse(raw) : raw;
  }
  check(items, "live-kv");
} else {
  for (const [file, label] of [
    [path.join(frontendRoot, "data", "bootstrap-store.json"), "bootstrap"],
    [path.join(repoRoot, "backend", "data", "store.json"), "backend"],
  ]) {
    if (!existsSync(file)) continue;
    const data = JSON.parse(readFileSync(file, "utf-8"));
    check(data.items ?? data, label);
  }
}

if (errors.length) {
  console.error(`\nRECIPROCITY GATE FAILED (${errors.length}):`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log("\nReciprocity gate PASSED.");
